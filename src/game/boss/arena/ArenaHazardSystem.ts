import * as THREE from 'three';
import { Ronin } from '../../characters/Ronin';

export interface HazardConfig {
  position: THREE.Vector3;
  radius: number;
  damage: number;
  telegraphDuration: number;
  activeDuration: number;
}

class ArenaHazard {
  public root: THREE.Group;
  public config: HazardConfig;
  public state: 'TELEGRAPH' | 'ACTIVE' | 'DONE' = 'TELEGRAPH';
  public timer: number = 0;
  
  private telegraphMesh: THREE.Mesh;
  private activeMesh: THREE.Mesh;

  constructor(config: HazardConfig) {
    this.config = config;
    this.root = new THREE.Group();
    this.root.position.copy(config.position);

    // Telegraph (glowing ring on ground)
    const tGeo = new THREE.RingGeometry(config.radius - 0.2, config.radius, 32);
    const tMat = new THREE.MeshBasicMaterial({ color: 0xff4400, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    this.telegraphMesh = new THREE.Mesh(tGeo, tMat);
    this.telegraphMesh.rotation.x = -Math.PI / 2;
    this.telegraphMesh.position.y = 0.05;

    // Active (pillar of energy)
    const aGeo = new THREE.CylinderGeometry(config.radius, config.radius, 10, 32);
    const aMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
    this.activeMesh = new THREE.Mesh(aGeo, aMat);
    this.activeMesh.position.y = 5.0;
    this.activeMesh.visible = false;

    this.root.add(this.telegraphMesh);
    this.root.add(this.activeMesh);
  }

  public update(dt: number, player: Ronin): void {
    this.timer += dt;

    if (this.state === 'TELEGRAPH') {
      const p = this.timer / this.config.telegraphDuration;
      // Blink telegraph faster as it approaches end
      this.telegraphMesh.visible = Math.sin(p * 20) > 0;
      if (this.timer >= this.config.telegraphDuration) {
        this.state = 'ACTIVE';
        this.timer = 0;
        this.telegraphMesh.visible = false;
        this.activeMesh.visible = true;
      }
    } else if (this.state === 'ACTIVE') {
      // Check collision
      const distSq = new THREE.Vector2(player.root.position.x - this.config.position.x, player.root.position.z - this.config.position.z).lengthSq();
      if (distSq < this.config.radius * this.config.radius) {
        if (!player.health.isDead) {
          player['health']['currentHealth'] = Math.max(0, player['health']['currentHealth'] - this.config.damage * dt * 2.0); // DOT
        }
      }

      if (this.timer >= this.config.activeDuration) {
        this.state = 'DONE';
        this.root.visible = false;
      }
    }
  }
}

export class ArenaHazardSystem {
  private hazards: ArenaHazard[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnHazard(config: HazardConfig): void {
    const hazard = new ArenaHazard(config);
    this.hazards.push(hazard);
    this.scene.add(hazard.root);
  }

  public update(dt: number, player: Ronin): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hazard = this.hazards[i];
      hazard.update(dt, player);
      
      if (hazard.state === 'DONE') {
        this.scene.remove(hazard.root);
        this.hazards.splice(i, 1);
      }
    }
  }

  public reset(): void {
    for (const hazard of this.hazards) {
      this.scene.remove(hazard.root);
    }
    this.hazards = [];
  }
}
