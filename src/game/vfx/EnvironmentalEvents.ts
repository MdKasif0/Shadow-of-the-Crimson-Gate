import * as THREE from 'three';

export class EnvironmentalEvents {
  private lights: THREE.PointLight[] = [];

  public registerLanternLight(light: THREE.PointLight): void {
    this.lights.push(light);
    // Store original intensity in userData
    light.userData.baseIntensity = light.intensity;
  }

  public update(dt: number, time: number): void {
    // 1. Lantern Flicker
    // Only update a small subset per frame to save CPU
    const offset = Math.floor(time * 60) % 5; 
    for (let i = offset; i < this.lights.length; i += 5) {
      const light = this.lights[i];
      if (light.visible) {
        const base = light.userData.baseIntensity || 1.0;
        // Fast noise-like flicker
        const noise = Math.sin(time * 15 + i) * 0.1 + Math.sin(time * 23 + i * 2) * 0.05;
        light.intensity = base * (1.0 + noise);
      }
    }
  }
}
