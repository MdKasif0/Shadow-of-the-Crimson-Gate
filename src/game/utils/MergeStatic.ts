import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Merges static meshes that share a material into one mesh each, cutting draw
 * calls. Meshes under each of `containers` (buildings that fade out when they
 * hide the player, say) are merged among themselves, inside that container,
 * so the container can still fade as a whole.
 *
 * Left alone: instanced and transparent meshes, multi-material meshes, and
 * anything marked `userData.dynamic`, or inside something that is.
 */
export function mergeStatic(root: THREE.Object3D, containers: THREE.Object3D[] = []): { before: number; after: number } {
  root.updateMatrixWorld(true);
  const containerSet = new Set(containers);
  const buckets = new Map<THREE.Object3D, Map<string, THREE.Mesh[]>>();
  let before = 0;

  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    before++;
    if ((mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    if (Array.isArray(mesh.material) || mesh.material.transparent) return;

    // The nearest container above this mesh, or the root; and nothing dynamic on the way
    let owner: THREE.Object3D = root;
    for (let p: THREE.Object3D | null = mesh; p && p !== root; p = p.parent) {
      if (p.userData.dynamic) return;
      if (owner === root && containerSet.has(p) && p !== mesh) owner = p;
    }

    const geometry = mesh.geometry;
    const attributes = Object.keys(geometry.attributes).sort().join(',');
    const key = `${mesh.material.uuid}|${attributes}|${geometry.index ? 'i' : 'n'}|${mesh.castShadow}|${mesh.receiveShadow}`;
    let byKey = buckets.get(owner);
    if (!byKey) buckets.set(owner, byKey = new Map());
    const list = byKey.get(key);
    if (list) list.push(mesh);
    else byKey.set(key, [mesh]);
  });

  let merged = 0;
  const inverse = new THREE.Matrix4();
  const relative = new THREE.Matrix4();
  for (const [owner, byKey] of buckets) {
    inverse.copy(owner.matrixWorld).invert();
    for (const meshes of byKey.values()) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map(mesh => {
        relative.multiplyMatrices(inverse, mesh.matrixWorld);
        const copy = mesh.geometry.clone();
        copy.applyMatrix4(relative);
        // Group indices from the source would confuse the merged mesh
        copy.clearGroups();
        return copy;
      });
      const geometry = mergeGeometries(geometries, false);
      geometries.forEach(g => g.dispose());
      if (!geometry) continue;

      const first = meshes[0];
      const combined = new THREE.Mesh(geometry, first.material);
      combined.castShadow = first.castShadow;
      combined.receiveShadow = first.receiveShadow;
      combined.name = 'Merged';
      owner.add(combined);
      for (const mesh of meshes) {
        mesh.removeFromParent();
        mesh.geometry.dispose();
      }
      merged += meshes.length - 1;
    }
  }
  return { before, after: before - merged };
}
