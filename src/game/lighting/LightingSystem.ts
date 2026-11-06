import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { SettingsManager } from '../settings/SettingsManager';
import { GRAPHICS_PRESETS, SettingsData } from '../settings/SettingsData';
import { MOON_DIRECTION } from '../atmosphere/SkyDome';
import { LightSource, WorldLights } from './WorldLights';

/** Half-width of the area around the player that gets sharp shadows. */
const SHADOW_EXTENT = 34;
const LIGHT_DISTANCE = 90;
const POOL_REFRESH_SECONDS = 0.3;

interface PoolSlot {
  light: THREE.PointLight;
  source: LightSource | null;
}

/**
 * LightingSystem — Cool moonlight with shadows that follow the player, warm lamps
 * from a small pool of real lights, and sky/ground fill per zone.
 */
export class LightingSystem {
  public hemisphere: THREE.HemisphereLight;
  public moon: THREE.DirectionalLight;
  private warmBack: THREE.DirectionalLight;
  private heroLight: THREE.PointLight;
  private bossLight: THREE.PointLight;

  private currentColor = new THREE.Color(0x3a4f78);
  private currentIntensity = 1.6;
  private groundColor = new THREE.Color();

  private pool: PoolSlot[] = [];
  private activeSlots: number = 0;
  private poolTimer: number = 0;
  private time: number = 0;

  private moonOffset = MOON_DIRECTION.clone().multiplyScalar(LIGHT_DISTANCE);
  private sampleCenter = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.hemisphere = new THREE.HemisphereLight(0x3a4f78, 0x1a1412, this.currentIntensity);
    scene.add(this.hemisphere);

    this.moon = new THREE.DirectionalLight(0xb4cdff, 2.6);
    const shadow = this.moon.shadow;
    shadow.camera.near = 1;
    shadow.camera.far = LIGHT_DISTANCE * 2;
    shadow.camera.left = shadow.camera.bottom = -SHADOW_EXTENT;
    shadow.camera.right = shadow.camera.top = SHADOW_EXTENT;
    shadow.bias = -0.0004;
    shadow.normalBias = 0.05;
    scene.add(this.moon, this.moon.target);

    // Faint warm kick from the far side of the moon, so nothing is one flat colour
    this.warmBack = new THREE.DirectionalLight(0xff9a66, 0.32);
    this.warmBack.position.copy(MOON_DIRECTION).multiplyScalar(-50).setY(18);
    scene.add(this.warmBack);

    // Soft light carried with the player, which keeps them readable in dark areas
    this.heroLight = new THREE.PointLight(0xa8c4ff, 7, 12, 1.8);
    scene.add(this.heroLight);

    this.bossLight = new THREE.PointLight(0xff3010, 0, 26, 1.6);
    scene.add(this.bossLight);

    for (let i = 0; i < GRAPHICS_PRESETS.HIGH.lampLights; i++) {
      const light = new THREE.PointLight(0xffa24a, 0, 16, 1.7);
      scene.add(light);
      this.pool.push({ light, source: null });
    }

    this.applyGraphicsQuality(SettingsManager.getInstance().get().graphicsQuality);
    EventBus.on('settingsChanged', (settings: SettingsData) => {
      this.applyGraphicsQuality(settings.graphicsQuality);
    });
  }

  /** Builds image-based lighting from a night gradient, so metal has something to reflect. */
  public buildEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(
      new THREE.SphereGeometry(50, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `varying vec3 vDir;
          void main(){
            vec3 sky = mix(vec3(0.16, 0.2, 0.32), vec3(0.03, 0.05, 0.1), max(vDir.y, 0.0));
            vec3 ground = vec3(0.05, 0.04, 0.035);
            vec3 moon = vec3(2.2, 2.5, 3.0) * smoothstep(0.93, 0.99, dot(normalize(vDir), normalize(vec3(0.42, 0.62, -0.66))));
            gl_FragColor = vec4(mix(ground, sky, smoothstep(-0.05, 0.05, vDir.y)) + moon, 1.0);
          }`,
      }),
    ));

    const generator = new THREE.PMREMGenerator(renderer);
    scene.environment = generator.fromScene(envScene, 0.02).texture;
    scene.environmentIntensity = 0.42;
    generator.dispose();
  }

  /** A shadow map size of 0 turns shadows off. */
  private applyGraphicsQuality(quality: SettingsData['graphicsQuality']): void {
    const preset = GRAPHICS_PRESETS[quality];
    const shadow = this.moon.shadow;

    this.moon.castShadow = preset.shadowMapSize > 0;
    if (preset.shadowMapSize > 0 && shadow.mapSize.x !== preset.shadowMapSize) {
      shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
      // The renderer rebuilds the map at the new size on the next frame
      shadow.map?.dispose();
      shadow.map = null;
    }

    this.activeSlots = preset.lampLights;
    this.pool.forEach((slot, i) => {
      slot.light.visible = i < this.activeSlots;
    });
    this.poolTimer = 0;
  }

  /** Runs every frame, including during dialogue and hit-stop. */
  public tick(dt: number, playerPos: THREE.Vector3): void {
    this.time += dt;
    this.followWithShadows(playerPos);
    this.heroLight.position.set(playerPos.x, playerPos.y + 2.4, playerPos.z + 0.6);
    this.updateLampPool(dt, playerPos);
  }

  /** Moves the shadow area with the player, in whole shadow-map texels so edges don't shimmer. */
  private followWithShadows(playerPos: THREE.Vector3): void {
    const texel = (SHADOW_EXTENT * 2) / Math.max(this.moon.shadow.mapSize.x, 1);
    const x = Math.round(playerPos.x / texel) * texel;
    const z = Math.round(playerPos.z / texel) * texel;
    this.moon.target.position.set(x, 0, z);
    this.moon.position.set(x, 0, z).add(this.moonOffset);
  }

  private updateLampPool(dt: number, playerPos: THREE.Vector3): void {
    this.poolTimer -= dt;
    if (this.poolTimer <= 0) {
      this.poolTimer = POOL_REFRESH_SECONDS;
      this.assignLamps(playerPos);
    }

    for (let i = 0; i < this.activeSlots; i++) {
      const slot = this.pool[i];
      const source = slot.source;
      let targetIntensity = 0;
      if (source) {
        const flicker = 1
          + Math.sin(this.time * 11 + source.phase) * source.flicker * 0.6
          + Math.sin(this.time * 23 + source.phase * 2.3) * source.flicker * 0.4;
        targetIntensity = source.intensity * flicker;
      }
      // Fade rather than pop as lamps swap in and out of the pool
      slot.light.intensity += (targetIntensity - slot.light.intensity) * Math.min(1, dt * 7);
    }
  }

  private assignLamps(playerPos: THREE.Vector3): void {
    this.sampleCenter.copy(playerPos);

    const nearest = [...WorldLights.sources]
      .sort((a, b) => a.position.distanceToSquared(this.sampleCenter) - b.position.distanceToSquared(this.sampleCenter))
      .slice(0, this.activeSlots);

    // Keep slots already lighting a wanted lamp, to avoid needless fades
    for (let i = 0; i < this.activeSlots; i++) {
      const slot = this.pool[i];
      if (slot.source && !nearest.includes(slot.source)) slot.source = null;
    }
    const unassigned = nearest.filter(source => !this.pool.some(slot => slot.source === source));

    for (let i = 0; i < this.activeSlots && unassigned.length > 0; i++) {
      const slot = this.pool[i];
      // Wait until the old lamp has faded before moving the light
      if (slot.source === null && slot.light.intensity < 0.5) {
        const source = unassigned.shift()!;
        slot.source = source;
        slot.light.position.copy(source.position);
        slot.light.color.copy(source.color);
        slot.light.distance = source.range;
      }
    }
  }

  /** Red glow radiating from the boss. Pass 0 to turn it off. */
  public setBossGlow(position: THREE.Vector3 | null, intensity: number): void {
    if (position) this.bossLight.position.set(position.x, position.y + 2.6, position.z);
    this.bossLight.intensity += (intensity - this.bossLight.intensity) * 0.08;
  }

  public update(dt: number, targetColor?: THREE.Color, targetIntensity?: number): void {
    if (targetColor === undefined || targetIntensity === undefined) return;

    const lerpSpeed = Math.min(1, dt * 2.0);
    this.currentColor.lerp(targetColor, lerpSpeed);
    this.currentIntensity = THREE.MathUtils.lerp(this.currentIntensity, targetIntensity, lerpSpeed);

    this.hemisphere.color.copy(this.currentColor);
    // Light bouncing up off the ground is dimmer and warmer than the sky
    this.hemisphere.groundColor.copy(this.groundColor.copy(this.currentColor).multiplyScalar(0.35).lerp(new THREE.Color(0x2a1c14), 0.5));
    this.hemisphere.intensity = this.currentIntensity;
  }
}
