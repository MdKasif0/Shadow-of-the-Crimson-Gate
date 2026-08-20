import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { GAME_CONFIG } from '../GameConfig';
import { CollisionSystem } from '../collision/CollisionSystem';

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

    // Explicitly place lanterns to guide the player
    const positions = [
      // Entrance
      new THREE.Vector3(-4, 0, 10),
      new THREE.Vector3(4, 0, 10),
      new THREE.Vector3(-5, 0, 0),
      new THREE.Vector3(5, 0, 0),
      // Courtyard edges
      new THREE.Vector3(-10, 0, -10),
      new THREE.Vector3(10, 0, -10),
      // Path to Shrine
      new THREE.Vector3(-15, 0, -15),
      new THREE.Vector3(-25, 0, -15),
      // Path to Forest
      new THREE.Vector3(15, 0, -15),
      new THREE.Vector3(25, 0, -15),
      // Path to Temple
      new THREE.Vector3(-6, 0, -35),
      new THREE.Vector3(6, 0, -35),
      new THREE.Vector3(-8, 0, -45),
      new THREE.Vector3(8, 0, -45),
      new THREE.Vector3(-10, 0, -55),
      new THREE.Vector3(10, 0, -55),
    ];

    positions.forEach(pos => {
      const lantern = prefab.clone();
      lantern.position.copy(pos);
      
      // Slight scale variation
      const s = random.range(0.8, 1.1);
      lantern.scale.set(s, s, s);
      
      // Random Y rotation
      lantern.rotation.y = random.next() * Math.PI / 2;

      group.add(lantern);
      
      // Add collision for lanterns
      collisionSystem.addBox(new THREE.Box3(
        new THREE.Vector3(pos.x - 1, 0, pos.z - 1),
        new THREE.Vector3(pos.x + 1, 4, pos.z + 1)
      ));
    });

    return group;
  }
}
