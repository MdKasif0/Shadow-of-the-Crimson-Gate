import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { GAME_CONFIG } from '../GameConfig';
import { CollisionSystem } from '../physics/CollisionSystem';

export class LanternGenerator {
  public static generate(random: SeededRandom, collisionSystem: CollisionSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Lanterns';

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x333b44, roughness: 0.9, metalness: 0.1 });
    const emissiveMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });

    // Build base lantern geometry by merging primitives
    const baseGeo = new THREE.BoxGeometry(1.2, 0.4, 1.2);
    baseGeo.translate(0, 0.2, 0);
    
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.5, 4);
    pillarGeo.translate(0, 1.15, 0);
    
    const headBaseGeo = new THREE.BoxGeometry(1.4, 0.2, 1.4);
    headBaseGeo.translate(0, 2.0, 0);
    
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    bodyGeo.translate(0, 2.5, 0);
    
    const roofGeo = new THREE.ConeGeometry(1.4, 0.8, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 3.3, 0);
    
    const capGeo = new THREE.SphereGeometry(0.3, 4, 2);
    capGeo.translate(0, 3.8, 0);

    const mergedGeometries = [baseGeo, pillarGeo, headBaseGeo, bodyGeo, roofGeo, capGeo];
    // In three.js r160+, use BufferGeometryUtils to merge if needed, 
    // but for instancing a multi-material object, we can just instance the parts 
    // or use a single material if we omit the emissive core from the main mesh.
    // To keep it simple without BufferGeometryUtils, we'll build a prefab Group and not use InstancedMesh 
    // since we only need 6-10 lanterns. (InstancedMesh is better for > 50).
    
    const prefab = new THREE.Group();
    
    mergedGeometries.forEach(geo => {
      const mesh = new THREE.Mesh(geo, stoneMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      prefab.add(mesh);
    });

    // Emissive core
    const coreGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    coreGeo.translate(0, 2.5, 0);
    const core = new THREE.Mesh(coreGeo, emissiveMat);
    prefab.add(core);

    const pointLight = new THREE.PointLight(0xffaa44, 1, 8);
    pointLight.position.set(0, 2.5, 0);
    prefab.add(pointLight);

    const lanternCount = 8;
    const bounds = GAME_CONFIG.WORLD.BOUNDS;

    let placed = 0;
    while (placed < lanternCount) {
      const x = random.range(bounds.MIN_X + 5, bounds.MAX_X - 5);
      const z = random.range(bounds.MIN_Z + 5, bounds.MAX_Z - 5);
      
      // Prefer placing near the path (x near 0)
      if (Math.abs(x) > 8 && random.next() > 0.3) continue;
      
      const distFromCenter = Math.sqrt(x*x + z*z);
      if (distFromCenter < 5) continue; // Keep spawn clear
      if (z < -5 && Math.abs(x) < 8) continue; // Keep temple entrance clear

      const lantern = prefab.clone();
      lantern.position.set(x, 0, z);
      
      // Slight scale variation
      const s = random.range(0.8, 1.1);
      lantern.scale.set(s, s, s);
      
      // Random Y rotation
      lantern.rotation.y = random.next() * Math.PI / 2;

      group.add(lantern);
      placed++;
    }

    return group;
  }
}
