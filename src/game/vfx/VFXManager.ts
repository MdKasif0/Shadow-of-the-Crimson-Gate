import * as THREE from 'three';
import { ParticlePool } from './ParticlePool';
import { CombatEvents } from '../combat/CombatEvents';
import { GAME_CONFIG } from '../GameConfig';
import { CameraController } from '../core/CameraController';
import { AudioManager } from '../audio/AudioManager';

export class VFXManager {
  private scene: THREE.Scene;
  private cameraController: CameraController;

  // Pools
  private sparkPool: ParticlePool;
  private spiritPool: ParticlePool;
  private dashPool: ParticlePool;

  // Slash Ribbon (simple plane for now)
  private slashMesh: THREE.Mesh;
  private slashMaterial: THREE.MeshBasicMaterial;
  private slashActive: boolean = false;
  private slashTimer: number = 0;

  constructor(scene: THREE.Scene, cameraController: CameraController) {
    this.scene = scene;
    this.cameraController = cameraController;

    // 1. Initialize Spark Pool (for hits and hurt)
    const sparkGeo = new THREE.BoxGeometry(0.1, 0.1, 0.4);
    const sparkMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sparkPool = new ParticlePool(sparkGeo, sparkMat, 100);
    this.scene.add(this.sparkPool.mesh);

    // 2. Initialize Spirit Pool (for enemy death)
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
    this.scene.add(this.spiritPool.mesh);

    // 3. Initialize Dash Pool (afterimages)
    const dashGeo = new THREE.BoxGeometry(0.8, 1.8, 0.4);
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.dashPool = new ParticlePool(dashGeo, dashMat, 20);
    this.scene.add(this.dashPool.mesh);

    // 4. Initialize Slash Mesh
    const slashGeo = new THREE.PlaneGeometry(3, 3);
    this.slashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.slashMesh = new THREE.Mesh(slashGeo, this.slashMaterial);
    this.slashMesh.visible = false;
    this.scene.add(this.slashMesh);
  }

  public update(dt: number): void {
    // Update Pools
    this.sparkPool.update(dt, (p, dt) => {
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.multiplyScalar(0.9); // Drag
      p.scale = p.life / p.maxLife; // Shrink
      // Align spark to velocity (simplified)
      // Since it's instanced, the dummy matrix is updated in pool, but we can't easily rotate it per particle in the standard callback without overriding the dummy logic.
      // For now, shrinking is fine.
    });

    this.spiritPool.update(dt, (p, dt) => {
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.y += dt * 0.5; // Float up
      p.velocity.x += (Math.random() - 0.5) * dt; // Drift
      p.velocity.z += (Math.random() - 0.5) * dt; // Drift
      p.scale = (p.life / p.maxLife);
    });

    this.dashPool.update(dt, (p, dt) => {
      p.scale = (p.life / p.maxLife); // Shrink over time
    });

    // Update Slash
    if (this.slashActive) {
      this.slashTimer -= dt;
      if (this.slashTimer <= 0) {
        this.slashActive = false;
        this.slashMesh.visible = false;
      } else {
        // Fade out
        this.slashMaterial.opacity = (this.slashTimer / 0.15);
      }
    }
  }

  // --- API ---

  public spawnSlash(position: THREE.Vector3, direction: THREE.Vector3, type: number): void {
    this.slashActive = true;
    this.slashTimer = 0.15;
    this.slashMesh.visible = true;
    this.slashMaterial.opacity = 1.0;
    
    // Position slightly ahead of the player
    this.slashMesh.position.copy(position).addScaledVector(direction, 1.5);
    this.slashMesh.position.y = 1.0;
    
    // Rotate to face direction
    this.slashMesh.rotation.set(Math.PI / 2, 0, Math.atan2(direction.x, direction.z));
    
    if (type === 3) {
      this.slashMesh.scale.set(1.5, 1.5, 1.5);
      this.slashMaterial.color.setHex(0xffffff); // Bright white
    } else {
      this.slashMesh.scale.set(1, 1, 1);
      this.slashMaterial.color.setHex(0xaaaaaa);
    }
  }

  public spawnHit(position: THREE.Vector3, direction: THREE.Vector3, isHeavy: boolean): void {
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

    if (isHeavy) {
      // Small point light flash would go here if not too expensive. Let's skip for performance.
    }
  }

  public spawnHurt(position: THREE.Vector3): void {
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

  public spawnDeath(position: THREE.Vector3): void {
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

  public spawnDash(position: THREE.Vector3, rotationY: number): void {
    // Create an afterimage block
    const p = position.clone();
    p.y += 0.9; // center of character
    this.dashPool.emit(p, new THREE.Vector3(0,0,0), 0.3, 1.0);
    // Note: To rotate the afterimage, we'd need to modify the particle dummy rotation in the pool.
    // For now, this creates a trailing box shape.
  }
}
