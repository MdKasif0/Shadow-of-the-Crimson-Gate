import * as THREE from 'three';

/**
 * CameraShake — Procedural noise-based camera shake.
 * Extracted from CameraController for single-responsibility.
 */
export class CameraShake {
  private intensity: number = 0;
  private offset: THREE.Vector3 = new THREE.Vector3();

  /** Add shake energy (capped at 2.0) */
  public addShake(amount: number): void {
    this.intensity = Math.min(this.intensity + amount, 2.0);
  }

  /** Apply shake to a position vector, returns the shake offset applied */
  public apply(position: THREE.Vector3, dt: number): THREE.Vector3 {
    if (this.intensity > 0.01) {
      this.offset.set(
        (Math.random() - 0.5) * this.intensity,
        (Math.random() - 0.5) * this.intensity,
        0
      );
      position.add(this.offset);

      // Decay
      this.intensity = THREE.MathUtils.lerp(this.intensity, 0, dt * 10);
    } else {
      this.intensity = 0;
      this.offset.set(0, 0, 0);
    }

    return this.offset;
  }

  public reset(): void {
    this.intensity = 0;
    this.offset.set(0, 0, 0);
  }
}
