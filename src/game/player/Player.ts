import * as THREE from 'three';
import { AssetManager } from '../core/AssetManager';
import { ASSET_PATHS } from '../config/AssetConfig';
import { PlayerMovement } from './PlayerMovement';
import { AnimationController } from './AnimationController';
import { CollisionSystem } from '../physics/CollisionSystem';

export enum PlayerState {
  IDLE = 'idle',
  WALK = 'walk'
}

export class Player {
  public playerRoot: THREE.Group;
  private scene: THREE.Scene;
  private assetManager: AssetManager;
  private movement: PlayerMovement;
  private animationController: AnimationController | null = null;
  public currentState: PlayerState = PlayerState.IDLE;
  private collisionSystem: CollisionSystem;

  constructor(scene: THREE.Scene, assetManager: AssetManager, collisionSystem: CollisionSystem) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.collisionSystem = collisionSystem;
    this.playerRoot = new THREE.Group();
    this.scene.add(this.playerRoot);
    
    // Pass playerRoot and collisionSystem to movement
    this.movement = new PlayerMovement(this.playerRoot, this.collisionSystem);

    // Add a personal fill light to make the character readable in the dark environment
    const playerFillLight = new THREE.PointLight(0x88bbff, 1.2, 5);
    playerFillLight.position.set(0, 3, 1);
    this.playerRoot.add(playerFillLight);

    this.loadModel();
  }

  private async loadModel(): Promise<void> {
    try {
      const cloneData = this.assetManager.cloneModel(ASSET_PATHS.MODELS.PLAYER);
      if (!cloneData) return;

      const model = cloneData.scene;

      // 1. Calculate original size
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      // 2. Target player height is exactly 2.0 units
      const targetHeight = 2.0;
      const currentHeight = size.y > 0.001 ? size.y : 1.0;
      const scaleFactor = targetHeight / currentHeight;
      model.scale.set(scaleFactor, scaleFactor, scaleFactor);
      
      // 3. Pivot offset (bottom of bounding box at Y=0)
      const scaledBox = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      scaledBox.getCenter(center);
      
      model.position.y = -scaledBox.min.y;
      model.position.x = -center.x;
      model.position.z = -center.z;

      // 4. Shadows
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // 5. Add mesh to player root and setup animations
      this.playerRoot.add(model);
      this.animationController = new AnimationController(model, cloneData.animations);
      
      // Start initial state
      if (this.animationController) {
        this.animationController.play(PlayerState.IDLE);
      }
    } catch (e) {
      console.error("[Player] Failed to load or initialize player model", e);
    }
  }

  public update(deltaTime: number): void {
    if (this.animationController) {
      this.animationController.update(deltaTime);
    }
    
    this.movement.update(deltaTime);
    
    // Determine state based on velocity
    if (this.movement.isMoving()) {
      this.setState(PlayerState.WALK);
    } else {
      this.setState(PlayerState.IDLE);
    }
  }

  private setState(newState: PlayerState): void {
    if (this.currentState === newState) return;
    
    this.currentState = newState;
    
    if (this.animationController) {
      this.animationController.play(this.currentState, 0.2);
    }
  }

  public dispose(): void {
    this.movement.dispose();
  }
}
