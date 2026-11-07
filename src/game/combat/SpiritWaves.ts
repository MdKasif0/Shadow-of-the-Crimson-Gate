import * as THREE from 'three';
import { HitboxSystem } from './HitboxSystem';
import { createGlowSprite } from '../lighting/WorldLights';

const SPEED = 19;
const LIFETIME = 0.85;
const DAMAGE = 26;
const RADIUS = 0.95;

interface Wave {
  id: string;
  sprite: THREE.Sprite;
  direction: THREE.Vector3;
  age: number;
}

/**
 * SpiritWaves — Crescents of spirit loosed by the Ronin's Spirit Wave. Each is
 * its own attacker, so every wave can strike every enemy once.
 */
export class SpiritWaves {
  private waves: Wave[] = [];
  private count = 0;

  constructor(private scene: THREE.Scene) {}

  public fire(origin: THREE.Vector3, direction: THREE.Vector3, isTriple: boolean, hitboxSystem: HitboxSystem): void {
    const angles = isTriple ? [-0.3, 0, 0.3] : [0];
    for (const angle of angles) {
      const sprite = createGlowSprite(0x8fe6ff, 1.9, 0.95);
      sprite.scale.set(2.2, 0.8, 1);
      sprite.position.copy(origin).setY(1.2);
      this.scene.add(sprite);

      const id = `PLAYER_WAVE_${this.count++}`;
      hitboxSystem.resetAttackMemory(id);
      this.waves.push({ id, sprite, direction: direction.clone().setY(0).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle), age: 0 });
    }
  }

  /** Moves each wave on and offers its hitbox for this frame. */
  public update(dt: number, hitboxSystem: HitboxSystem, damageMultiplier: number): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      wave.age += dt;
      wave.sprite.position.addScaledVector(wave.direction, SPEED * dt);
      wave.sprite.material.opacity = 0.95 * (1 - wave.age / LIFETIME);

      if (wave.age >= LIFETIME) {
        this.remove(i);
        continue;
      }

      hitboxSystem.addActiveHitbox({
        ownerId: wave.id,
        damage: Math.round(DAMAGE * damageMultiplier),
        position: wave.sprite.position.clone().setY(0),
        direction: wave.direction.clone(),
        range: RADIUS,
        hitAngle: Math.PI * 2,
        hitboxType: 'RADIAL',
        knockback: 6,
        stagger: 0.25,
        focusGain: 0,
        hitStop: 0.03,
        shake: 0.4,
        posture: 0.9,
      });
    }
  }

  public clear(): void {
    for (let i = this.waves.length - 1; i >= 0; i--) this.remove(i);
  }

  private remove(index: number): void {
    const [wave] = this.waves.splice(index, 1);
    this.scene.remove(wave.sprite);
    wave.sprite.material.dispose();
  }
}
