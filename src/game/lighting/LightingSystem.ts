import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { SettingsManager } from '../settings/SettingsManager';
import { GRAPHICS_PRESETS, SettingsData } from '../settings/SettingsData';

/**
 * LightingSystem — Manages all scene lights.
 * Now supports dynamic ambient color/intensity transitions per zone.
 */
export class LightingSystem {
  public ambient: THREE.AmbientLight;
  public directional: THREE.DirectionalLight;
  public moonLight: THREE.DirectionalLight;

  private currentAmbientColor: THREE.Color = new THREE.Color(0xffffff);
  private currentAmbientIntensity: number = 2.0;

  constructor(scene: THREE.Scene) {
    // Ambient fill
    this.ambient = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(this.ambient);

    // Main directional (moonlight)
    this.directional = new THREE.DirectionalLight(0xaaccff, 3.5); // Softer, bluish key light
    this.directional.position.set(20, 40, 30);
    this.directional.shadow.camera.near = 0.5;
    this.directional.shadow.camera.far = 250;
    const d = 160; 
    this.directional.shadow.camera.left = -d;
    this.directional.shadow.camera.right = d;
    this.directional.shadow.camera.top = d;
    this.directional.shadow.camera.bottom = -d;
    this.directional.shadow.bias = -0.001;
    scene.add(this.directional);

    // Subtle ambient bounce
    this.moonLight = new THREE.DirectionalLight(0x445588, 0.4);
    this.moonLight.position.set(-50, 100, -50);
    this.moonLight.castShadow = false;
    scene.add(this.moonLight);

    this.applyGraphicsQuality(SettingsManager.getInstance().get().graphicsQuality);
    EventBus.on('settingsChanged', (settings: SettingsData) => {
      this.applyGraphicsQuality(settings.graphicsQuality);
    });
  }

  /** A shadow map size of 0 turns shadows off. */
  private applyGraphicsQuality(quality: SettingsData['graphicsQuality']): void {
    const size = GRAPHICS_PRESETS[quality].shadowMapSize;
    const shadow = this.directional.shadow;

    this.directional.castShadow = size > 0;
    if (size > 0 && shadow.mapSize.x !== size) {
      shadow.mapSize.set(size, size);
      // The renderer rebuilds the map at the new size on the next frame
      shadow.map?.dispose();
      shadow.map = null;
    }
  }

  public update(dt: number, targetColor?: THREE.Color, targetIntensity?: number): void {
    if (targetColor !== undefined && targetIntensity !== undefined) {
      const lerpSpeed = dt * 2.0;
      this.currentAmbientColor.lerp(targetColor, lerpSpeed);
      this.currentAmbientIntensity = THREE.MathUtils.lerp(this.currentAmbientIntensity, targetIntensity, lerpSpeed);

      this.ambient.color.copy(this.currentAmbientColor);
      this.ambient.intensity = this.currentAmbientIntensity;
    }
  }
}
