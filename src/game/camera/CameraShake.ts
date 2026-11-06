import * as THREE from 'three';

const MAX_INTENSITY = 2.0;
const DECAY_RATE = 7;
/** World units of movement at full intensity. The camera sits close, so this is small. */
const POSITION_SCALE = 0.11;
const ROLL_SCALE = 0.012;

/**
 * CameraShake — Smooth layered-sine shake with a touch of roll, which reads as
 * impact rather than the jitter that per-frame random offsets produce up close.
 */
export class CameraShake {
  private intensity: number = 0;
  private time: number = 0;
  public offset: THREE.Vector3 = new THREE.Vector3();
  public roll: number = 0;

  public addShake(amount: number): void {
    this.intensity = Math.min(this.intensity + amount, MAX_INTENSITY);
  }

  public update(dt: number): void {
    this.time += dt;

    if (this.intensity <= 0.01) {
      this.reset();
      return;
    }

    const t = this.time;
    const scale = this.intensity * POSITION_SCALE;
    this.offset.set(
      (Math.sin(t * 47) + Math.sin(t * 83 + 1.3) * 0.6) * scale,
      (Math.sin(t * 59 + 2.1) + Math.sin(t * 97 + 0.7) * 0.6) * scale,
      Math.sin(t * 41 + 4.2) * scale * 0.6,
    );
    this.roll = Math.sin(t * 37 + 0.4) * this.intensity * ROLL_SCALE;
    this.intensity *= Math.exp(-DECAY_RATE * dt);
  }

  public reset(): void {
    this.intensity = 0;
    this.roll = 0;
    this.offset.set(0, 0, 0);
  }
}
