import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { GAME_CONFIG } from '../GameConfig';

export class RockGenerator {
  public static generate(random: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Rocks';

    const rockCount = 45;
    const geometries: THREE.BufferGeometry[] = [];

    // Create 3 variant rock geometries
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.IcosahedronGeometry(1, 1);
      const pos = geo.attributes.position;
      
      // Deform vertices
      for (let j = 0; j < pos.count; j++) {
        const y = pos.getY(j);
        // Flatten bottom
        if (y < 0) {
          pos.setY(j, y * 0.2); 
        }
        // Random jitter
        pos.setX(j, pos.getX(j) * (0.8 + random.next() * 0.4));
        pos.setY(j, pos.getY(j) * (0.8 + random.next() * 0.4));
        pos.setZ(j, pos.getZ(j) * (0.8 + random.next() * 0.4));
      }
      
      geo.computeVertexNormals();
      geometries.push(geo);
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x222a33,
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true,
    });

    // Create instanced meshes for the variants
    const instancedMeshes = geometries.map(geo => {
      const mesh = new THREE.InstancedMesh(geo, material, rockCount);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      return mesh;
    });

    const dummy = new THREE.Object3D();
    const bounds = GAME_CONFIG.WORLD.BOUNDS;
    
    // Distribute rocks mostly around perimeter
    let rockIndex = 0;
    while (rockIndex < rockCount) {
      const x = random.range(bounds.MIN_X - 5, bounds.MAX_X + 5);
      const z = random.range(bounds.MIN_Z - 5, bounds.MAX_Z + 5);
      
      const distFromCenter = Math.sqrt(x*x + z*z);
      // Avoid spawn area and center
      if (distFromCenter < 12) continue;
      
      // Avoid temple area
      if (z < -10 && Math.abs(x) < 15) continue;

      dummy.position.set(x, 0, z);
      
      // Vary width/height
      const scaleX = random.range(0.8, 2.5);
      const scaleY = random.range(0.5, 1.8);
      const scaleZ = random.range(0.8, 2.5);
      dummy.scale.set(scaleX, scaleY, scaleZ);
      
      dummy.rotation.y = random.next() * Math.PI * 2;
      dummy.rotation.x = (random.next() - 0.5) * 0.2;
      dummy.rotation.z = (random.next() - 0.5) * 0.2;
      
      dummy.updateMatrix();
      
      const variantIndex = Math.floor(random.next() * 3);
      instancedMeshes[variantIndex].setMatrixAt(rockIndex, dummy.matrix);
      rockIndex++;
    }

    instancedMeshes.forEach(mesh => group.add(mesh));
    return group;
  }
}
