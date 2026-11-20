import * as THREE from 'three';
import { createGlowSprite } from '../lighting/WorldLights';

interface Flash {
  group: THREE.Group;
  ring: THREE.Mesh;
  glow: THREE.Sprite;
  age: number;
}

const LIFE = 0.32;

/**
 * ParryFlash — A bright ring and burst of light where a parry meets the blow,
 * so a perfect guard reads instantly, even in a crowd.
 */
export class ParryFlash {
  private flashes: Flash[] = [];
  private ringGeometry = new THREE.RingGeometry(0.55, 0.7, 40);

  constructor(private scene: THREE.Scene) {}

  public spawn(position: THREE.Vector3, facing: THREE.Vector3): void {
    const group = new THREE.Group();
    group.position.copy(position);
    group.lookAt(position.clone().add(facing));
    const ring = new THREE.Mesh(this.ringGeometry, new THREE.MeshBasicMaterial({
      color: 0xfff2c8, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const glow = createGlowSprite(0xffd890, 2.6, 1);
    group.add(ring, glow);
    this.scene.add(group);
    this.flashes.push({ group, ring, glow, age: 0 });
  }

  public update(dt: number): void {
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const flash = this.flashes[i];
      flash.age += dt;
      const t = flash.age / LIFE;
      const fade = Math.max(0, 1 - t);
      flash.ring.scale.setScalar(1 + t * 2.4);
      (flash.ring.material as THREE.MeshBasicMaterial).opacity = fade;
      (flash.glow.material as THREE.SpriteMaterial).opacity = fade * fade;
      flash.glow.scale.setScalar(2.6 * (1 + t));
      if (t >= 1) {
        flash.group.removeFromParent();
        (flash.ring.material as THREE.Material).dispose();
        (flash.glow.material as THREE.Material).dispose();
        this.flashes.splice(i, 1);
      }
    }
  }
}
