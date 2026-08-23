import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { GAME_CONFIG } from '../GameConfig';
import { CollisionSystem } from '../collision/CollisionSystem';

export class TreeGenerator {
  public static generate(random: SeededRandom, collisionSystem: CollisionSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Trees';

    const treeCount = 80; // Increased for expanded world
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.9 });
    
    // Foliage instancing setup
    const foliageGeo = new THREE.DodecahedronGeometry(1.2, 0); // low poly cluster
    // Slightly squash it
    foliageGeo.scale(1, 0.7, 1);
    foliageGeo.computeVertexNormals();

    const foliageMat = new THREE.MeshStandardMaterial({ 
      color: 0xffaacc, 
      roughness: 0.6,
      transparent: true,
      opacity: 0.9,
    });
    
    // We might have ~15 clusters per tree
    const maxFoliage = treeCount * 18;
    const foliageInstanced = new THREE.InstancedMesh(foliageGeo, foliageMat, maxFoliage);
    foliageInstanced.castShadow = true;
    let foliageIndex = 0;
    const dummy = new THREE.Object3D();

    const bounds = GAME_CONFIG.WORLD.BOUNDS;

    let placed = 0;
    while (placed < treeCount) {
      // Favor placing more trees in the forest zone (-50 to -20)
      const isForest = random.next() > 0.6;
      const x = random.range(bounds.MIN_X - 10, bounds.MAX_X + 10);
      const z = isForest 
        ? random.range(-50, -20)
        : random.range(bounds.MIN_Z - 10, bounds.MAX_Z + 10);
      
      const distFromCenter = Math.abs(x);
      
      // Keep main path clear
      if (distFromCenter < 5) continue;
      
      // Keep temple clear
      if (z < -45 && distFromCenter < 18) continue;
      
      // Keep courtyard center clear
      if (z > 0 && z < 40 && distFromCenter < 12) continue;

      // Keep entrance clear
      if (z > 50 && distFromCenter < 8) continue;

      const tree = new THREE.Group();
      tree.position.set(x, 0, z);

      // Forest trees are dead, twisted, and lack pink foliage
      if (isForest) {
        // Twisted dead tree
        const height = random.range(6, 12);
        const radiusBottom = random.range(0.5, 0.9);
        
        const trunkGeo = new THREE.CylinderGeometry(radiusBottom * 0.4, radiusBottom, height, 7);
        trunkGeo.translate(0, height / 2, 0);
        
        // Bend the trunk
        const pos = trunkGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const py = pos.getY(i);
          const factor = py / height;
          pos.setX(i, pos.getX(i) + Math.sin(factor * Math.PI) * random.range(-1, 2));
          pos.setZ(i, pos.getZ(i) + Math.cos(factor * Math.PI) * random.range(-1, 2));
        }
        trunkGeo.computeVertexNormals();

        const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }));
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        
        trunk.rotation.y = random.next() * Math.PI * 2;
        trunk.rotation.x = (random.next() - 0.5) * 0.4;
        tree.add(trunk);

        // Twisted branches
        const branchCount = Math.floor(random.range(2, 5));
        for (let b = 0; b < branchCount; b++) {
          const bHeight = height * random.range(0.3, 0.8);
          const bLength = random.range(3, 6);
          const branchGeo = new THREE.CylinderGeometry(0.1, radiusBottom * 0.5, bLength, 5);
          branchGeo.translate(0, bLength / 2, 0);
          
          const bPos = branchGeo.attributes.position;
          for (let i = 0; i < bPos.count; i++) {
            const py = bPos.getY(i);
            const factor = py / bLength;
            bPos.setX(i, bPos.getX(i) + Math.sin(factor * Math.PI) * 1.5);
          }
          branchGeo.computeVertexNormals();

          const branch = new THREE.Mesh(branchGeo, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }));
          branch.castShadow = true;
          branch.position.y = bHeight;
          branch.rotation.x = random.range(0.6, 1.4);
          branch.rotation.y = (b / branchCount) * Math.PI * 2 + random.next();
          trunk.add(branch);
        }

        // Add dark red ground bushes near the tree
        if (random.next() > 0.3) {
          const bushCount = Math.floor(random.range(1, 4));
          for (let c = 0; c < bushCount; c++) {
            if (foliageIndex < maxFoliage) {
              dummy.position.set((random.next() - 0.5) * 3, random.range(0, 0.5), (random.next() - 0.5) * 3);
              const scale = random.range(0.8, 1.5);
              dummy.scale.set(scale, scale * 0.5, scale);
              dummy.rotation.set(random.next(), random.next(), random.next());
              
              tree.updateMatrixWorld();
              dummy.applyMatrix4(tree.matrixWorld);
              foliageInstanced.setMatrixAt(foliageIndex, dummy.matrix);
              // Dark red foliage
              foliageInstanced.setColorAt(foliageIndex, new THREE.Color(0x440a10));
              foliageIndex++;
            }
          }
        }

      } else {
        // Normal Sakura Tree
        const height = random.range(5, 9);
        const radiusBottom = random.range(0.4, 0.6);
        const radiusTop = radiusBottom * 0.4;
        
        const trunkGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 6);
        trunkGeo.translate(0, height / 2, 0);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        
        trunk.rotation.x = (random.next() - 0.5) * 0.2;
        trunk.rotation.z = (random.next() - 0.5) * 0.2;
        trunk.rotation.y = random.next() * Math.PI * 2;
        tree.add(trunk);

        const branchCount = Math.floor(random.range(3, 6));
        for (let b = 0; b < branchCount; b++) {
          const bHeight = height * random.range(0.4, 0.9);
          const bLength = random.range(2, 4);
          
          const branchGeo = new THREE.CylinderGeometry(radiusTop * 0.4, radiusTop * 0.8, bLength, 5);
          branchGeo.translate(0, bLength / 2, 0);
          const branch = new THREE.Mesh(branchGeo, trunkMat);
          branch.castShadow = true;
          
          branch.position.y = bHeight;
          branch.rotation.x = random.range(0.4, 1.2);
          branch.rotation.y = (b / branchCount) * Math.PI * 2 + random.next() * 0.5;
          trunk.add(branch);

          const clusterCount = Math.floor(random.range(2, 4));
          for (let c = 0; c < clusterCount; c++) {
            if (foliageIndex < maxFoliage) {
              dummy.position.set(0, bLength * random.range(0.6, 1.1), 0);
              dummy.position.x += (random.next() - 0.5) * 1.5;
              dummy.position.y += (random.next() - 0.5) * 1.0;
              dummy.position.z += (random.next() - 0.5) * 1.5;
              const scale = random.range(1.2, 2.2);
              dummy.scale.set(scale, scale, scale);
              dummy.rotation.set(random.next(), random.next(), random.next());
              branch.updateMatrixWorld();
              dummy.applyMatrix4(branch.matrixWorld);
              foliageInstanced.setMatrixAt(foliageIndex, dummy.matrix);
              
              const colorVariant = new THREE.Color(0xffaacc);
              if (random.next() > 0.7) colorVariant.setHex(0xff7799);
              else if (random.next() > 0.8) colorVariant.setHex(0xffffff);
              foliageInstanced.setColorAt(foliageIndex, colorVariant);
              foliageIndex++;
            }
          }
        }
        
        if (foliageIndex < maxFoliage) {
          dummy.position.set(0, height, 0);
          const scale = random.range(2.0, 3.0);
          dummy.scale.set(scale, scale, scale);
          trunk.updateMatrixWorld();
          dummy.applyMatrix4(trunk.matrixWorld);
          foliageInstanced.setMatrixAt(foliageIndex, dummy.matrix);
          foliageInstanced.setColorAt(foliageIndex, new THREE.Color(0xffaacc));
          foliageIndex++;
        }
      }

      group.add(tree);
      placed++;
    }

    foliageInstanced.instanceMatrix.needsUpdate = true;
    if (foliageInstanced.instanceColor) foliageInstanced.instanceColor.needsUpdate = true;
    
    group.add(foliageInstanced);
    return group;
  }
}
