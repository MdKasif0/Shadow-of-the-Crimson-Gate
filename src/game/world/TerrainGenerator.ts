import * as THREE from 'three';
import { fbm } from '../utils/Noise';
import { createGroundMaterial } from '../utils/MaterialUtils';

export class TerrainGenerator {
  public static create(size: number): THREE.Group {
    const group = new THREE.Group();
    const segments = 64;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    // Apply subtle height variation
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i); const z = pos.getZ(i);
      const distFromCenter = Math.sqrt(x * x + z * z);
      // Courtyard is flat, edges rise slightly
      const edgeFactor = Math.max(0, (distFromCenter - 12) / 10);
      const height = fbm(x * 0.1 + 50, z * 0.1 + 50, 3) * edgeFactor * 1.5;
      pos.setY(i, height);
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, createGroundMaterial());
    mesh.receiveShadow = true;
    group.add(mesh);

    // Stone path down the center leading to temple
    const pathGeo = new THREE.PlaneGeometry(3.5, 20, 1, 1);
    pathGeo.rotateX(-Math.PI / 2);
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x3a3632, roughness: 0.9, metalness: 0.0,
    });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.position.set(0, 0.01, -5);
    path.receiveShadow = true;
    group.add(path);

    return group;
  }
}
