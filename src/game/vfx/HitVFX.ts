import * as THREE from 'three';
import { ParticlePool } from './ParticlePool';
import { AudioManager } from '../audio/AudioManager';

/**
 * HitVFX — Directional spark burst on confirmed hits.
 */
export class HitVFX {
  private sparkPool: ParticlePool;

  constructor(scene: THREE.Scene) {
    const sparkGeo = new THREE.BoxGeometry(0.1, 0.1, 0.4);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sparkPool = new ParticlePool(sparkGeo, sparkMat, 100);
    scene.add(this.sparkPool.mesh);
  }

  public spawn(position: THREE.Vector3, direction: THREE.Vector3, isHeavy: boolean): void {
    AudioManager.playSwordHit();
    const count = isHeavy ? 15 : 8;
    for (let i = 0; i < count; i++) {
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const vel = direction.clone().multiplyScalar(5).add(spread.multiplyScalar(3));
      this.sparkPool.emit(position.clone().add(new THREE.Vector3(0, 1, 0)), vel, 0.2 + Math.random() * 0.2);
    }
  }

  public update(dt: number): void {
    this.sparkPool.update(dt, (p) => {
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.multiplyScalar(0.9);
      p.scale = p.life / p.maxLife;
    });
  }
}
