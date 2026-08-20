import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { GAME_CONFIG } from '../GameConfig';
import { CollisionSystem } from '../collision/CollisionSystem';

export class RockGenerator {
  public static generate(random: SeededRandom, collisionSystem: CollisionSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Rocks';

    const rockCount = 150;
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
    
    let rockIndex = 0;
    let attempts = 0;
    while (rockIndex < rockCount && attempts < 2000) {
      attempts++;
      const x = random.range(-45, 45);
      const z = random.range(-75, 35);
      
      // Carve out safe zones where rocks CANNOT spawn
      
      // 1. Main Central Path
      if (Math.abs(x) < 10 && z > -70 && z < 40) continue;
      
      // 2. Courtyard Arena
      const distToCourtyard = Math.sqrt(x*x + Math.pow(z + 5, 2));
      if (distToCourtyard < 20) continue;
      
      // 3. Shrine Area & Path
      const distToShrine = Math.sqrt(Math.pow(x + 25, 2) + Math.pow(z + 20, 2));
      if (distToShrine < 16) continue;
      if (x < 0 && x > -25 && Math.abs(z + 20) < 6) continue;
      
      // 4. Forest Arena & Path
      const distToForest = Math.sqrt(Math.pow(x - 25, 2) + Math.pow(z + 25, 2));
      if (distToForest < 16) continue;
      if (x > 0 && x < 25 && Math.abs(z + 25) < 6) continue;
      
      // 5. Temple Approach
      if (Math.abs(x) < 20 && z < -40) continue;

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
      
      // Register simple sphere collision based on max scale
      const maxRadius = Math.max(scaleX, scaleZ);
      collisionSystem.addSphere(new THREE.Vector3(x, 0, z), maxRadius * 0.9);

      rockIndex++;
    }

    instancedMeshes.forEach(mesh => group.add(mesh));
    return group;
  }
}
