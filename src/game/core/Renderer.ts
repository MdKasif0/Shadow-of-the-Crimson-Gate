import * as THREE from 'three';
import { EventBus } from './EventBus';
import { SettingsManager } from '../settings/SettingsManager';
import { GRAPHICS_PRESETS, SettingsData } from '../settings/SettingsData';

export class Renderer {
  public webgl: THREE.WebGLRenderer;
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;

    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    
    // Configure robust WebGL settings
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.0;
    
    // Pixel ratio cap comes from the Graphics Quality setting
    this.applyGraphicsQuality(SettingsManager.getInstance().get().graphicsQuality);

    // Shadow maps
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFShadowMap;

    this.container.appendChild(this.webgl.domElement);
    this.resize();

    EventBus.on('settingsChanged', (settings: SettingsData) => {
      this.applyGraphicsQuality(settings.graphicsQuality);
    });
  }

  private applyGraphicsQuality(quality: SettingsData['graphicsQuality']): void {
    const maxPixelRatio = GRAPHICS_PRESETS[quality].maxPixelRatio;
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  }

  public resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.webgl.setSize(width, height);
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.webgl.render(scene, camera);
  }

  public destroy(): void {
    this.webgl.dispose();
    this.webgl.domElement.remove();
  }
}
