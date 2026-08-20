import * as THREE from 'three';
import { ParticlePool } from './ParticlePool';

/**
 * DashVFX — Afterimage trail during dash.
 */
export class DashVFX {
  private dashPool: ParticlePool;

  constructor(scene: THREE.Scene) {
    const dashGeo = new THREE.BoxGeometry(0.8, 1.8, 0.4);
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.dashPool = new ParticlePool(dashGeo, dashMat, 20);
    scene.add(this.dashPool.mesh);
  }

  public spawn(position: THREE.Vector3, _rotationY: number): void {
    const p = position.clone();
    p.y += 0.9;
    this.dashPool.emit(p, new THREE.Vector3(0, 0, 0), 0.3, 1.0);
  }

  public update(dt: number): void {
    this.dashPool.update(dt, (p) => {
      p.scale = p.life / p.maxLife;
    });
  }
}
