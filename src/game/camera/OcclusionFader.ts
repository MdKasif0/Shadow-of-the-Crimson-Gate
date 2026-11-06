import * as THREE from 'three';

const FADED_OPACITY = 0.16;
const CHECK_INTERVAL = 0.08;
const FADE_SPEED = 7;

interface Occluder {
  object: THREE.Object3D;
  bounds: THREE.Box3;
  opacity: number;
  isBlocking: boolean;
  /** Also fades when the camera itself is inside the object, as with a tree's canopy. */
  fadeWhenCameraInside: boolean;
  /** Original material of each mesh, and the see-through clone used while faded. */
  swaps: { mesh: THREE.Mesh; original: THREE.Material; faded: THREE.MeshStandardMaterial }[] | null;
  isSwapped: boolean;
}

/** Fades trees and buildings that come between the camera and the player. */
export class OcclusionFader {
  private occluders: Occluder[] = [];
  private raycaster = new THREE.Raycaster();
  private timer = 0;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private ray = new THREE.Ray();
  private hitPoint = new THREE.Vector3();

  public register(object: THREE.Object3D, fadeWhenCameraInside: boolean = false): void {
    object.updateWorldMatrix(true, true);
    this.occluders.push({
      object,
      bounds: new THREE.Box3().setFromObject(object),
      opacity: 1,
      isBlocking: false,
      fadeWhenCameraInside,
      swaps: null,
      isSwapped: false,
    });
  }

  public update(dt: number, camera: THREE.Camera, playerPos: THREE.Vector3): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = CHECK_INTERVAL;
      this.raycaster.camera = camera; // Sprites need this to raycast
      this.detectBlockers(camera.position, playerPos);
    }

    for (const occluder of this.occluders) {
      const target = occluder.isBlocking ? FADED_OPACITY : 1;
      if (occluder.opacity === target) continue;

      occluder.opacity += (target - occluder.opacity) * Math.min(1, FADE_SPEED * dt);
      if (Math.abs(occluder.opacity - target) < 0.01) occluder.opacity = target;
      this.applyOpacity(occluder);
    }
  }

  /** Clears all fading at once, for use when the camera jumps. */
  public reset(): void {
    for (const occluder of this.occluders) {
      occluder.isBlocking = false;
      occluder.opacity = 1;
      this.applyOpacity(occluder);
    }
  }

  private detectBlockers(cameraPos: THREE.Vector3, playerPos: THREE.Vector3): void {
    this.from.copy(cameraPos);
    this.to.copy(playerPos).setY(playerPos.y + 1.2);
    this.direction.copy(this.to).sub(this.from);
    const distance = this.direction.length();
    this.direction.normalize();
    this.ray.set(this.from, this.direction);
    this.raycaster.set(this.from, this.direction);
    this.raycaster.far = distance - 0.3;

    for (const occluder of this.occluders) {
      if (occluder.fadeWhenCameraInside && occluder.bounds.containsPoint(this.from)) {
        occluder.isBlocking = true;
        continue;
      }

      const hitsBounds = this.ray.intersectBox(occluder.bounds, this.hitPoint) !== null
        && this.hitPoint.distanceTo(this.from) < distance;
      // Glows and light pools are see-through, so only solid surfaces count
      occluder.isBlocking = hitsBounds && this.raycaster.intersectObject(occluder.object, true)
        .some(hit => (hit.object as THREE.Mesh).material instanceof THREE.MeshStandardMaterial);
    }
  }

  private applyOpacity(occluder: Occluder): void {
    if (occluder.opacity >= 1) {
      if (occluder.isSwapped && occluder.swaps) {
        for (const swap of occluder.swaps) swap.mesh.material = swap.original;
        occluder.isSwapped = false;
      }
      return;
    }

    if (!occluder.swaps) occluder.swaps = this.buildSwaps(occluder.object);
    for (const swap of occluder.swaps) {
      if (!occluder.isSwapped) swap.mesh.material = swap.faded;
      swap.faded.opacity = occluder.opacity;
    }
    occluder.isSwapped = true;
  }

  private buildSwaps(root: THREE.Object3D): NonNullable<Occluder['swaps']> {
    const swaps: NonNullable<Occluder['swaps']> = [];
    const clones = new Map<THREE.Material, THREE.MeshStandardMaterial>();

    root.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !(mesh.material instanceof THREE.MeshStandardMaterial)) return;

      const original = mesh.material;
      let faded = clones.get(original);
      if (!faded) {
        faded = original.clone();
        faded.onBeforeCompile = original.onBeforeCompile; // Keeps wind sway while faded
        faded.customProgramCacheKey = original.customProgramCacheKey;
        faded.transparent = true;
        faded.depthWrite = false;
        clones.set(original, faded);
      }
      swaps.push({ mesh, original, faded });
    });
    return swaps;
  }
}
