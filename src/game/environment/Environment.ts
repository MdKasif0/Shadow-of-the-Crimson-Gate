import * as THREE from 'three';
import { Scene, Object3D, Mesh, PlaneGeometry, MeshStandardMaterial, GridHelper } from 'three';
import { AssetManager } from '../core/AssetManager';
import { ASSET_PATHS } from '../config/AssetConfig';
import { CollisionSystem } from '../physics/CollisionSystem';

export class Environment {
  private scene: Scene;
  private assetManager: AssetManager;

  private collisionSystem: CollisionSystem;
  public root: THREE.Group;

  constructor(scene: Scene, assetManager: AssetManager, collisionSystem: CollisionSystem) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.collisionSystem = collisionSystem;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.loadEnvironment();
  }

  private async loadEnvironment(): Promise<void> {
    try {
      // Use a smaller scale to create "multiple small floors everywhere"
      // Based on visual analysis, the zorilla_floor model has a massive invisible bounding box.
      // Its true visual base size is exactly 1.5 units wide/deep.
      const gridX = 16;
      const gridZ = 16;
      const manualScale = 3.0;

      // True visual spacing without the invisible padding
      const trueBaseSize = 1.5;
      const spacingX = trueBaseSize * manualScale;
      const spacingZ = trueBaseSize * manualScale;
      
      const startX = - (gridX * spacingX) / 2 + (spacingX / 2);
      const startZ = - (gridZ * spacingZ) / 2 + (spacingZ / 2);

      for (let ix = 0; ix < gridX; ix++) {
        for (let iz = 0; iz < gridZ; iz++) {
          const tileClone = this.assetManager.cloneModel(ASSET_PATHS.MODELS.FLOOR);
          if (!tileClone) continue;
          
          const floorMesh = tileClone.scene;
          floorMesh.scale.set(manualScale, manualScale, manualScale);
          
          const scaledBox = new THREE.Box3().setFromObject(floorMesh);
          const center = new THREE.Vector3();
          scaledBox.getCenter(center);
          
          floorMesh.position.y = -scaledBox.max.y;
          
          // Use exact spacing
          floorMesh.position.x = -center.x + (startX + ix * spacingX);
          floorMesh.position.z = -center.z + (startZ + iz * spacingZ);
          
          floorMesh.receiveShadow = true;
          // IMPORTANT: Do not enable castShadow on the floor to save massive performance
          // We only let it receive shadows from the trees/player/temple
          this.root.add(floorMesh);
        }
      }

      // 2. Composition

      // Background
      this.spawnScaledModel(ASSET_PATHS.MODELS.MOUNTAIN, { x: 0, z: -50 }, 50.0);
      this.spawnScaledModel(ASSET_PATHS.MODELS.TEMPLE, { x: 0, z: -30 }, 25.0);

      // Entrance Framing
      this.spawnScaledModel(ASSET_PATHS.MODELS.TORII, { x: -15, z: -10 }, 8.0, Math.PI / 6);

      // Points of Interest
      this.spawnScaledModel(ASSET_PATHS.MODELS.SHRINE, { x: 15, z: -10 }, 5.0, -Math.PI / 6);

      // Sakura Trees (Edge scatter to frame the scene)
      const treePositions = [
        { x: -25, z: -20, h: 15, r: 0 },
        { x: 25, z: -20, h: 18, r: 1.5 },
        { x: -20, z: -5, h: 12, r: 2.1 },
        { x: 22, z: 5, h: 14, r: 0.5 },
        { x: -28, z: 15, h: 16, r: -1.2 },
        { x: 26, z: 20, h: 15, r: 3.1 }
      ];
      treePositions.forEach(pos => {
        this.spawnScaledModel(ASSET_PATHS.MODELS.SAKURA, { x: pos.x, z: pos.z }, pos.h, pos.r);
      });

      // Lanterns (Scatter along pathways)
      const lanternPositions = [
        { x: -8, z: -12, r: 0.2 },
        { x: 8, z: -15, r: -0.4 },
        { x: -18, z: -8, r: 0.1 },
        { x: 12, z: -8, r: 0.5 },
        { x: -10, z: 5, r: -0.2 },
        { x: 10, z: 8, r: 0.8 },
        { x: -5, z: 15, r: 0 },
        { x: 5, z: 18, r: -0.5 }
      ];
      lanternPositions.forEach(pos => {
        this.spawnScaledModel(ASSET_PATHS.MODELS.LANTERN, { x: pos.x, z: pos.z }, 1.5, pos.r);
      });

      // Rocks (Base clutter)
      const rockPositions = [
        { x: -2, z: -28, h: 2, r: 1.0 },
        { x: 3, z: -29, h: 1.5, r: -0.5 },
        { x: -16, z: -9, h: 1.2, r: 0.2 },
        { x: 14, z: -11, h: 2.5, r: -1.1 }
      ];
      rockPositions.forEach(pos => {
        this.spawnScaledModel(ASSET_PATHS.MODELS.ROCKS, { x: pos.x, z: pos.z }, pos.h, pos.r);
      });

    } catch (e) {
      console.error("[Environment] Failed to load environment models", e);
    }
  }

  /**
   * Spawns a model, scales it to EXACTLY targetHeight, and automatically shifts its pivot
   * so the bottom of the bounding box rests flush on Y=0.
   */
  private spawnScaledModel(path: string, position: { x: number, z: number }, targetHeight: number, rotationY: number = 0): void {
    const cloneData = this.assetManager.cloneModel(path);
    if (!cloneData) return;

    const mesh = cloneData.scene;
    const wrapper = new THREE.Group();

    // 1. Calculate original size
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    // 2. Scale
    const currentHeight = size.y > 0.001 ? size.y : 1.0;
    const scaleFactor = targetHeight / currentHeight;
    mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // 3. Shift Pivot
    const scaledBox = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);
    
    // Move mesh locally so bottom is at Y=0 and it's centered
    mesh.position.y = -scaledBox.min.y;
    mesh.position.x = -center.x;
    mesh.position.z = -center.z;

    // 4. Position & Rotate the Wrapper globally
    wrapper.add(mesh);
    wrapper.position.set(position.x, 0, position.z);
    wrapper.rotation.y = rotationY;

    // Register simple box collider based on the scaled box for obstacles
    // Ignore ground tiles or background mountains for collision system here,
    // we only care about the gameplay obstacles like temple, torii, shrine, rocks.
    if (!path.includes('floor') && !path.includes('mountain') && !path.includes('sakura')) {
      const globalBox = new THREE.Box3().setFromObject(wrapper);
      this.collisionSystem.addBox(globalBox);
    }
    // Trees use circle colliders
    if (path.includes('sakura')) {
      this.collisionSystem.addCircle(new THREE.Vector3(position.x, 0, position.z), 1.5);
    }

    // 5. Shadows
    this.enableShadows(wrapper);

    this.root.add(wrapper);
  }

  private enableShadows(object: Object3D): void {
    object.traverse((child) => {
      if ((child as Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }
}
