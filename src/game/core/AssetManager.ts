import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export class AssetManager {
  private manager: THREE.LoadingManager;
  private loader: GLTFLoader;
  private cache: Map<string, GLTF> = new Map();
  private loadingPromises: Map<string, Promise<GLTF>> = new Map();

  constructor() {
    this.manager = new THREE.LoadingManager();
    this.loader = new GLTFLoader(this.manager);
  }

  /**
   * Preload a list of models with a progress callback.
   */
  public async loadAll(paths: string[], onProgress?: (progress: number) => void): Promise<void> {
    if (onProgress) {
      this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
        onProgress(itemsLoaded / itemsTotal);
      };
    }

    const promises = paths.map(path => this.loadModel(path));
    await Promise.all(promises);

    // Reset progress callback to avoid memory leaks
    this.manager.onProgress = () => {};
  }

  /**
   * Loads a GLTF/GLB model, caching the promise so simultaneous requests
   * for the same path don't trigger multiple network loads.
   */
  public async loadModel(path: string): Promise<GLTF> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }

    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path)!;
    }

    const promise = new Promise<GLTF>((resolve, reject) => {
      this.loader.load(
        path,
        (gltf: GLTF) => {
          this.cache.set(path, gltf);
          resolve(gltf);
        },
        undefined,
        (error: unknown) => {
          console.error(`Failed to load model: ${path}`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(path, promise);
    return promise;
  }

  /**
   * Safely clones a cached GLTF scene, ensuring SkinnedMeshes and bones are preserved properly.
   * If the model contains animations, returns them alongside the cloned scene.
   */
  public cloneModel(path: string): { scene: THREE.Group; animations: THREE.AnimationClip[] } | null {
    const gltf = this.cache.get(path);
    if (!gltf) {
      console.warn(`Attempted to clone model ${path} before it was loaded.`);
      return null;
    }

    // Use SkeletonUtils to clone everything properly, including bones.
    const clonedScene = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    return { scene: clonedScene, animations: gltf.animations || [] };
  }
}
