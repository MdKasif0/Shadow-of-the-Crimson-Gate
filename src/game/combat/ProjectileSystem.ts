import * as THREE from 'three';
import { Projectile, ProjectileType } from './Projectile';
import { Ronin } from '../characters/Ronin';
import { VFXManager } from '../vfx/VFXManager';
import { CameraController } from '../camera/CameraController';
import { EventBus } from '../core/EventBus';

export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private poolSize: number = 20;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    for (let i = 0; i < 15; i++) {
      const proj = new Projectile(`proj_def_${i}`, 'DEFAULT');
      this.projectiles.push(proj);
      this.scene.add(proj.root);
    }
    for (let i = 0; i < 5; i++) {
      const proj = new Projectile(`proj_arc_${i}`, 'CRIMSON_ARC');
      this.projectiles.push(proj);
      this.scene.add(proj.root);
    }
  }

  public spawnProjectile(
    ownerId: string,
    startPos: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    knockback: number,
    maxLifetime: number = 3.0,
    type: ProjectileType = 'DEFAULT'
  ): void {
    const proj = this.projectiles.find(p => !p.active && p.type === type);
    if (proj) {
      proj.fire(ownerId, startPos, direction, speed, damage, knockback, maxLifetime);
    }
  }

  public update(dt: number, player: Ronin, vfx: VFXManager, cameraController: CameraController): void {
    for (const proj of this.projectiles) {
      if (!proj.active) continue;

      proj.update(dt);

      if (!proj.active) continue; // deactivated by lifetime

      // Simple sphere collision with player
      if (!player.health.isDead) {
        // Player hurtbox is roughly radius 0.5, height 2.0. 
        // Projectile radius is roughly 0.3. Let's use simple distance check.
        // We check XZ distance, and Y bounds.
        const dx = player.root.position.x - proj.position.x;
        const dz = player.root.position.z - proj.position.z;
        const distSq = dx * dx + dz * dz;

        const combinedRadiusSq = (0.5 + 0.3) * (0.5 + 0.3);
        
        if (distSq < combinedRadiusSq) {
          const py = player.root.position.y;
          if (proj.position.y > py && proj.position.y < py + 2.0) {
            // Hit!
            const oldHp = player['health']['currentHealth'];
            player.takeDamage(proj.damage, proj.direction, proj.knockback);
            const newHp = player['health']['currentHealth'];

            EventBus.emit('playerHealth', {
              current: newHp,
              max: player['health']['maxHealth'],
              delta: newHp - oldHp
            });

            if (newHp <= 0) {
              EventBus.emit('playerDeath');
            } else {
              vfx.spawnHit(proj.position, proj.direction, false);
              cameraController.addShake(0.5);
            }

            // Destroy projectile
            vfx.spawnHurt(proj.position); // just some generic particles
            proj.deactivate();
          }
        }
      }
    }
  }

  public clearAll(): void {
    for (const proj of this.projectiles) {
      proj.deactivate();
    }
  }
}
