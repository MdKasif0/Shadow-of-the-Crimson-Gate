import * as THREE from 'three';
import { Player } from '../player/Player';
import { Environment } from '../environment/Environment';
import { LightingSystem } from '../lighting/LightingSystem';
import { AtmosphereSystem } from '../atmosphere/AtmosphereSystem';
import { AssetManager } from '../core/AssetManager';
import { CollisionSystem } from '../physics/CollisionSystem';

export class CombatScene {
  public scene: THREE.Scene;
  public player: Player;
  public collisionSystem: CollisionSystem;
  private environment: Environment;
  private lighting: LightingSystem;
  private atmosphere: AtmosphereSystem;

  constructor(assetManager: AssetManager) {
    this.scene = new THREE.Scene();
    
    this.collisionSystem = new CollisionSystem(this.scene);

    // The order of initialization here is important for visual layering
    
    // 1. Lighting
    this.lighting = new LightingSystem(this.scene);
    
    // 2. Atmosphere (Fog & Particles)
    this.atmosphere = new AtmosphereSystem(this.scene);
    
    // 3. Environment
    this.environment = new Environment(this.scene, assetManager, this.collisionSystem);
    
    // 4. Player
    this.player = new Player(this.scene, assetManager, this.collisionSystem);
  }

  public update(deltaTime: number): void {
    this.atmosphere.update(deltaTime);
    this.player.update(deltaTime);
  }

  public dispose(): void {
    this.player.dispose();
    // Additional cleanup for THREE.Scene if necessary
  }
}
