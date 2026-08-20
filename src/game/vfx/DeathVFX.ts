import * as THREE from 'three';
import { ParticlePool } from './ParticlePool';
import { AudioManager } from '../audio/AudioManager';

/**
 * DeathVFX — Spirit particle burst when an enemy dies.
 */
export class DeathVFX {
  private spiritPool: ParticlePool;

  constructor(scene: THREE.Scene) {
    const spiritGeo = new THREE.PlaneGeometry(0.3, 0.3);
    const spiritMat = new THREE.MeshBasicMaterial({
      color: 0x88ffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.spiritPool = new ParticlePool(spiritGeo, spiritMat, 200);
    scene.add(this.spiritPool.mesh);
  }

  public spawn(position: THREE.Vector3): void {
    AudioManager.playEnemyDeath();
    for (let i = 0; i < 40; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      this.spiritPool.emit(position.clone().add(new THREE.Vector3(0, 1, 0)), vel, 1.0 + Math.random() * 1.0);
    }
  }

  public update(dt: number): void {
    this.spiritPool.update(dt, (p) => {
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.y += dt * 0.5;
      p.velocity.x += (Math.random() - 0.5) * dt;
      p.velocity.z += (Math.random() - 0.5) * dt;
      p.scale = p.life / p.maxLife;
    });
  }
}
