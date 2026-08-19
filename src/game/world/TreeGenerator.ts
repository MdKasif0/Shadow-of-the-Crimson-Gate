import * as THREE from 'three';
import { createDarkWoodMaterial, createSakuraFoliageMaterial } from '../utils/MaterialUtils';
import { SeededRandom } from '../utils/MathUtils';

export class TreeGenerator {
  public static create(seed: number = 1, height: number = 8): THREE.Group {
    const tree = new THREE.Group();
    const rng = new SeededRandom(seed);
    const trunkMat = createDarkWoodMaterial();
    const foliageMat = createSakuraFoliageMaterial();

    // Trunk (tapered cylinder)
    const trunkHeight = height * 0.45;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.25, trunkHeight, 6), trunkMat
    );
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Branches (2-4 spreading limbs)
    const branchCount = Math.floor(rng.range(2, 5));
    for (let i = 0; i < branchCount; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const tilt = rng.range(0.3, 0.8);
      const length = rng.range(1.5, 3.0);
      const branchY = trunkHeight * rng.range(0.6, 0.95);

      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.08, length, 4), trunkMat
      );
      branch.position.set(
        Math.cos(angle) * 0.3, branchY, Math.sin(angle) * 0.3
      );
      branch.rotation.z = -tilt * Math.cos(angle);
      branch.rotation.x = -tilt * Math.sin(angle);
      branch.castShadow = true;
      tree.add(branch);

      // Foliage cluster at branch tip
      const clusterSize = rng.range(1.2, 2.5);
      const cluster = new THREE.Mesh(
        new THREE.SphereGeometry(clusterSize, 6, 5), foliageMat
      );
      cluster.position.set(
        Math.cos(angle) * (length * 0.7),
        branchY + 0.5,
        Math.sin(angle) * (length * 0.7)
      );
      cluster.scale.y = 0.6; // Flatten
      cluster.castShadow = true;
      tree.add(cluster);
    }

    // Central canopy
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(height * 0.28, 7, 5), foliageMat
    );
    canopy.position.y = trunkHeight + 0.5;
    canopy.scale.y = 0.5;
    canopy.castShadow = true;
    tree.add(canopy);

    return tree;
  }
}
