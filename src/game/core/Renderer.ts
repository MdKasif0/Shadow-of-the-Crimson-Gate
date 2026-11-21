import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { EventBus } from './EventBus';
import { SettingsManager } from '../settings/SettingsManager';
import { GRAPHICS_PRESETS, SettingsData } from '../settings/SettingsData';
import { LoadReporter } from '../ui/LoadingScreen';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ScreenPulse } from '../rendering/ScreenPulse';
import { CinematicGradeShader, ColorGrade, DEFAULT_GRADE, MAX_HAZE_SOURCES } from '../rendering/CinematicGrade';
import { HeatSources } from '../rendering/HeatSources';
import { applyHeightFog } from '../rendering/HeightFog';

// Fog that thins with height, applied before any material compiles
applyHeightFog();

/** Frames slower than this (about 38 FPS) trigger automatic quality reduction. */
const ADAPT_SLOW_FRAME_SECONDS = 0.026;
const ADAPT_SLOW_FRAME_SHARE = 0.7;
const ADAPT_SETTLE_SECONDS = 4;
const SHADER_COMPILE_LIMIT_MS = 15000;
const MIN_ADAPTIVE_PIXEL_RATIO = 1;

export class Renderer {
  public webgl: THREE.WebGLRenderer;
  private container: HTMLElement;

  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private aoPass: GTAOPass | null = null;
  private gradePass: ShaderPass | null = null;
  private dofPass: BokehPass | null = null;
  /** The grade being eased towards, and how far there. */
  private targetGrade: ColorGrade = DEFAULT_GRADE;
  private currentGrade: ColorGrade = { ...DEFAULT_GRADE, shadows: [...DEFAULT_GRADE.shadows], highlights: [...DEFAULT_GRADE.highlights] };
  private dofFocus: number | null = null;
  private dofAmount = 0;
  private blurAmount = 0;
  private blurDirection = new THREE.Vector2();
  private hazeProjected = new THREE.Vector3();

  private framesSinceAdapt: number = 0;
  private slowFramesSinceAdapt: number = 0;
  private secondsSinceAdapt: number = 0;
  private adaptivePixelRatio: number = 1;
  private isAOReduced: boolean = false;
  private appliedQuality: SettingsData['graphicsQuality'];

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;

    // Anti-aliasing comes from the composer's multisampled render target
    this.webgl = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });

    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.15;

    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFShadowMap;

    this.appliedQuality = SettingsManager.getInstance().get().graphicsQuality;
    this.applyPixelRatio(this.appliedQuality);

    this.container.appendChild(this.webgl.domElement);
    this.resize();

    EventBus.on('settingsChanged', (settings: SettingsData) => {
      // Other settings, like volume, mustn't undo automatic quality scaling
      if (settings.graphicsQuality !== this.appliedQuality) {
        this.appliedQuality = settings.graphicsQuality;
        this.applyPixelRatio(settings.graphicsQuality);
      }
      this.applyPasses();
    });
  }

  private applyPixelRatio(quality: SettingsData['graphicsQuality']): void {
    // Choosing a quality level gives automatic scaling a fresh start
    this.isAOReduced = false;
    this.secondsSinceAdapt = 0;
    this.framesSinceAdapt = 0;
    this.slowFramesSinceAdapt = 0;

    const pixelRatio = Math.min(window.devicePixelRatio, GRAPHICS_PRESETS[quality].maxPixelRatio);
    this.webgl.setPixelRatio(pixelRatio);
    this.composer?.setPixelRatio(pixelRatio);
  }

  private applyPasses(): void {
    const { graphicsQuality, reduceMotion } = SettingsManager.getInstance().get();
    const preset = GRAPHICS_PRESETS[graphicsQuality];
    if (this.bloomPass) this.bloomPass.enabled = preset.bloom;
    if (this.aoPass) this.aoPass.enabled = preset.ambientOcclusion && !this.isAOReduced;
    if (this.composer && this.composer.renderTarget1.samples !== preset.msaaSamples) {
      for (const target of [this.composer.renderTarget1, this.composer.renderTarget2]) {
        target.samples = preset.msaaSamples;
        target.dispose(); // Rebuilt with the new sample count on next use
      }
    }
    if (this.gradePass) {
      this.gradePass.uniforms.uGrain.value = reduceMotion ? 0 : 0.04;
      // Without multisampling, the grade pass smooths edges itself
      this.gradePass.uniforms.uFxaa.value = preset.msaaSamples === 0 ? 1 : 0;
    }
  }

  /** Eases the colour grade towards a level's own. */
  public setGrade(grade: ColorGrade, isInstant = false): void {
    this.targetGrade = grade;
    if (isInstant) this.currentGrade = { ...grade, shadows: [...grade.shadows], highlights: [...grade.highlights] };
  }

  /** Depth of field, for cinematic shots. Pass null to return to sharp play. */
  public setDepthOfField(focusDistance: number | null): void {
    this.dofFocus = focusDistance;
  }

  /** A streak of motion blur along a screen direction, fading on its own. */
  public kickMotionBlur(x: number, y: number, amount: number): void {
    if (SettingsManager.getInstance().get().reduceMotion) return;
    const length = Math.hypot(x, y);
    if (length < 0.001) return;
    this.blurDirection.set(x / length, y / length);
    this.blurAmount = Math.max(this.blurAmount, amount);
  }

  private updateCinematics(camera: THREE.Camera, dt: number): void {
    const pass = this.gradePass;
    if (!pass) return;
    const u = pass.uniforms;
    const ease = Math.min(1, dt * 1.6);
    const g = this.currentGrade;
    const t = this.targetGrade;
    for (let i = 0; i < 3; i++) {
      g.shadows[i] += (t.shadows[i] - g.shadows[i]) * ease;
      g.highlights[i] += (t.highlights[i] - g.highlights[i]) * ease;
    }
    g.saturation += (t.saturation - g.saturation) * ease;
    g.contrast += (t.contrast - g.contrast) * ease;
    g.lift += (t.lift - g.lift) * ease;
    g.vignette += (t.vignette - g.vignette) * ease;
    u.uShadows.value.set(...g.shadows);
    u.uHighlights.value.set(...g.highlights);
    u.uSaturation.value = g.saturation;
    u.uContrast.value = g.contrast;
    u.uLift.value = g.lift;
    u.uVignette.value = g.vignette;

    // A dodge's drained moment and a blow's kick both fade on their own
    const reduceMotion = SettingsManager.getInstance().get().reduceMotion;
    u.uSpirit.value = reduceMotion ? 0 : ScreenPulse.spirit;
    ScreenPulse.spiritAge += dt;
    u.uSpiritAge.value = ScreenPulse.spiritAge;
    u.uSpiritOrigin.value.set(ScreenPulse.origin.x, ScreenPulse.origin.y);
    u.uImpact.value = reduceMotion ? 0 : ScreenPulse.impact;
    ScreenPulse.spirit = Math.max(0, ScreenPulse.spirit - dt * 1.1);
    ScreenPulse.impact = Math.max(0, ScreenPulse.impact - dt * 6);

    // Motion blur dies away quickly
    this.blurAmount = Math.max(0, this.blurAmount - dt * 5);
    u.uBlurAmount.value = this.blurAmount;
    u.uBlurDirection.value.copy(this.blurDirection);

    const size = this.webgl.getDrawingBufferSize(new THREE.Vector2());
    u.uAspect.value = size.x / Math.max(size.y, 1);
    u.uTexel.value.set(1 / Math.max(size.x, 1), 1 / Math.max(size.y, 1));

    // Heat haze over the nearest fires in view
    const perspective = camera as THREE.PerspectiveCamera;
    const nearby = [...HeatSources.sources]
      .map(source => ({ source, distance: source.position.distanceTo(camera.position) }))
      .filter(item => item.distance < 45)
      .sort((a, b) => a.distance - b.distance);
    let count = 0;
    for (const { source, distance } of nearby) {
      if (count >= MAX_HAZE_SOURCES) break;
      this.hazeProjected.copy(source.position).setY(source.position.y + source.size * 0.8).project(camera);
      if (this.hazeProjected.z > 1 || Math.abs(this.hazeProjected.x) > 1.3 || Math.abs(this.hazeProjected.y) > 1.3) continue;
      const screenRadius = (source.size * 1.4) / (distance * Math.tan(THREE.MathUtils.degToRad((perspective.fov ?? 45) / 2)) * 2);
      u.uHaze.value[count].set(this.hazeProjected.x * 0.5 + 0.5, this.hazeProjected.y * 0.5 + 0.5, Math.min(0.5, screenRadius), source.strength * (1 - distance / 45));
      count++;
    }
    u.uHazeCount.value = SettingsManager.getInstance().get().reduceMotion ? 0 : count;

    // Depth of field fades in and out rather than snapping
    const dof = this.dofPass;
    if (dof) {
      const target = this.dofFocus !== null ? 1 : 0;
      this.dofAmount += (target - this.dofAmount) * Math.min(1, dt * 3);
      dof.enabled = this.dofAmount > 0.02 && GRAPHICS_PRESETS[SettingsManager.getInstance().get().graphicsQuality].bloom;
      const uniforms = (dof as unknown as { uniforms: Record<string, { value: number }> }).uniforms;
      if (this.dofFocus !== null) uniforms.focus.value = this.dofFocus;
      uniforms.aperture.value = 0.00035 * this.dofAmount;
      uniforms.maxblur.value = 0.008 * this.dofAmount;
    }
  }

  private buildComposer(scene: THREE.Scene, camera: THREE.Camera): EffectComposer {
    const size = this.webgl.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType, // Keeps values above 1.0, so lanterns and the moon can bloom
      samples: GRAPHICS_PRESETS[SettingsManager.getInstance().get().graphicsQuality].msaaSamples,
    });

    const composer = new EffectComposer(this.webgl, target);
    composer.setPixelRatio(this.webgl.getPixelRatio());
    composer.setSize(this.container.clientWidth, this.container.clientHeight);

    composer.addPass(new RenderPass(scene, camera));

    const aoPass = new GTAOPass(scene, camera, size.x, size.y);
    // Wide enough to darken where walls meet floors and objects meet the ground
    aoPass.updateGtaoMaterial({ radius: 1.1, distanceExponent: 1.5, thickness: 1.4, scale: 1.25, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    aoPass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1, rings: 2, samples: 8 });
    aoPass.blendIntensity = 1;
    this.excludeEffectsFromAO(aoPass, scene);
    composer.addPass(aoPass);
    this.aoPass = aoPass;

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.42, 0.65, 0.88);
    composer.addPass(this.bloomPass);

    this.dofPass = new BokehPass(scene, camera, { focus: 10, aperture: 0, maxblur: 0 });
    this.dofPass.enabled = false;
    composer.addPass(this.dofPass);

    composer.addPass(new OutputPass());

    this.gradePass = new ShaderPass(CinematicGradeShader);
    composer.addPass(this.gradePass);

    this.composer = composer;
    this.applyPasses();
    return composer;
  }

  /**
   * GTAOPass draws the scene into a depth and normal buffer. Glows, particles and
   * faded objects must stay out of it or they would cast dark halos on the world.
   */
  private excludeEffectsFromAO(aoPass: GTAOPass, scene: THREE.Scene): void {
    const hidden: THREE.Object3D[] = [];
    const pass = aoPass as unknown as { _overrideVisibility(): void; _restoreVisibility(): void };

    pass._overrideVisibility = () => {
      scene.traverseVisible(object => {
        const material = (object as THREE.Mesh).material as THREE.Material | undefined;
        const isEffect = (object as THREE.Points).isPoints
          || (object as THREE.Line).isLine
          || (object as THREE.Sprite).isSprite
          || object.userData.noAO
          || material?.transparent;
        if (isEffect) hidden.push(object);
      });
      for (const object of hidden) object.visible = false;
    };
    pass._restoreVisibility = () => {
      for (const object of hidden) object.visible = true;
      hidden.length = 0;
    };
  }

  /**
   * Compiles shaders and uploads the whole world to the GPU while the loading screen
   * is up. Otherwise each would stall the game the first time it comes into view.
   */
  public async prepare(scene: THREE.Scene, camera: THREE.Camera, report: LoadReporter): Promise<void> {
    await report(0);
    // Some drivers never finish reporting, so don't let that hold up the game
    await Promise.race([
      this.webgl.compileAsync(scene, camera),
      new Promise(resolve => setTimeout(resolve, SHADER_COMPILE_LIMIT_MS)),
    ]);
    await report(0.8);

    // Draw once with culling off, so everything outside this view is uploaded too
    const culled: THREE.Object3D[] = [];
    scene.traverse(object => {
      if (object.frustumCulled) {
        object.frustumCulled = false;
        culled.push(object);
      }
    });
    this.render(scene, camera);
    for (const object of culled) object.frustumCulled = true;
    await report(1);
  }

  public resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.webgl.setSize(width, height);
    this.composer?.setSize(width, height);
  }

  public render(scene: THREE.Scene, camera: THREE.Camera, dt: number = 0): void {
    const composer = this.composer ?? this.buildComposer(scene, camera);
    if (this.gradePass) this.gradePass.uniforms.uTime.value = (this.gradePass.uniforms.uTime.value + dt) % 100;
    this.updateCinematics(camera, dt);
    composer.render(dt);
    this.adaptQuality(dt);
  }

  /** If the frame rate stays low, gives up the costliest effects to keep the game smooth. */
  private adaptQuality(dt: number): void {
    if (dt <= 0 || document.hidden) return;

    // Counts slow frames rather than averaging them, so a one-off stall such as
    // a shader compiling doesn't cost the player their ambient occlusion
    this.framesSinceAdapt++;
    if (dt > ADAPT_SLOW_FRAME_SECONDS) this.slowFramesSinceAdapt++;
    this.secondsSinceAdapt += dt;
    if (this.secondsSinceAdapt < ADAPT_SETTLE_SECONDS) return;

    const isStruggling = this.slowFramesSinceAdapt / this.framesSinceAdapt > ADAPT_SLOW_FRAME_SHARE;
    this.secondsSinceAdapt = 0;
    this.framesSinceAdapt = 0;
    this.slowFramesSinceAdapt = 0;
    if (!isStruggling) return;

    if (this.aoPass?.enabled) {
      this.isAOReduced = true;
      this.aoPass.enabled = false;
    } else {
      this.adaptivePixelRatio = Math.max(MIN_ADAPTIVE_PIXEL_RATIO, this.webgl.getPixelRatio() - 0.25);
      if (this.adaptivePixelRatio === this.webgl.getPixelRatio()) return;
      this.webgl.setPixelRatio(this.adaptivePixelRatio);
      this.composer?.setPixelRatio(this.adaptivePixelRatio);
    }
  }

  public destroy(): void {
    this.composer?.dispose();
    this.webgl.dispose();
    this.webgl.domElement.remove();
  }
}
