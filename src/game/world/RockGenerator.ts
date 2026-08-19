import * as THREE from 'three';
import { createStoneMaterial } from '../utils/MaterialUtils';
import { createRockGeometry } from '../utils/GeometryUtils';

export class RockGenerator {
  public static create(seed: number = 1, radius: number = 0.8): THREE.Group {
    const group = new THREE.Group();
    const geo = createRockGeometry(radius, seed);
    const mesh = new THREE.Mesh(geo, createStoneMaterial());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }
}
