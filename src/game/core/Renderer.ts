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

/** Display-space grade: split-tone, contrast, vignette and film grain. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uGrain: { value: 0.035 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    varying vec2 vUv;

    float random(vec2 p) {
      return fract(sin(dot(p + uTime, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec3 color = texture2D(tDiffuse, vUv).rgb;
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));

      // Cool blue-teal shadows against warm highlights
      vec3 shadows = vec3(0.90, 1.00, 1.12);
      vec3 highlights = vec3(1.06, 1.00, 0.92);
      color *= mix(shadows, highlights, smoothstep(0.08, 0.65, luma));

      // Gentle S-curve for contrast, and a little more saturation
      color = mix(color, color * color * (3.0 - 2.0 * color), 0.35);
      color = mix(vec3(luma), color, 1.14);

      // Vignette
      vec2 centered = vUv - 0.5;
      color *= 1.0 - smoothstep(0.35, 0.95, length(centered) * 1.15) * 0.5;

      // Grain shows most in the shadows, as it does on film
      color += (random(vUv) - 0.5) * uGrain * (1.0 - luma * 0.7);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

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
    if (this.gradePass) this.gradePass.uniforms.uGrain.value = reduceMotion ? 0 : 0.035;
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
    aoPass.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.3, thickness: 1.2, scale: 1.1, samples: 10, distanceFallOff: 1, screenSpaceRadius: false });
    aoPass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1, rings: 2, samples: 8 });
    aoPass.blendIntensity = 0.85;
    this.excludeEffectsFromAO(aoPass, scene);
    composer.addPass(aoPass);
    this.aoPass = aoPass;

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.42, 0.65, 0.88);
    composer.addPass(this.bloomPass);

    composer.addPass(new OutputPass());

    this.gradePass = new ShaderPass(GradeShader);
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
