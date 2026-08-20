import * as THREE from 'three';
import { ParticlePool } from './ParticlePool';
import { AudioManager } from '../audio/AudioManager';

/**
 * HurtVFX — Red spark burst when the player takes damage.
 */
export class HurtVFX {
  private sparkPool: ParticlePool;

  constructor(scene: THREE.Scene) {
    const sparkGeo = new THREE.BoxGeometry(0.1, 0.1, 0.4);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sparkPool = new ParticlePool(sparkGeo, sparkMat, 60);
    scene.add(this.sparkPool.mesh);
  }

  public spawn(position: THREE.Vector3): void {
    AudioManager.playPlayerHurt();
    for (let i = 0; i < 10; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5,
        (Math.random() - 0.5) * 5
      );
      this.sparkPool.emit(position.clone().add(new THREE.Vector3(0, 1, 0)), vel, 0.3, 1.0, new THREE.Color(0xff4444));
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
