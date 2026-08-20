import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { CollisionSystem } from '../collision/CollisionSystem';

export class ShrineGenerator {
  public static generate(random: SeededRandom, collisionSystem: CollisionSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Shrines';

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x222a33, roughness: 0.9, flatShading: true });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x11161a, roughness: 0.7, flatShading: true });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc4a35a, metalness: 0.8, roughness: 0.2 });

    const createShrine = () => {
      const shrine = new THREE.Group();
      
      // Foundation steps
      for (let i = 0; i < 3; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(4 - i * 0.4, 0.2, 4 - i * 0.4), stoneMat);
        step.position.y = i * 0.2 + 0.1;
        step.castShadow = true;
        step.receiveShadow = true;
        shrine.add(step);
      }

      const baseLevel = 0.6;

      // Wooden body
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.2), woodMat);
      body.position.y = baseLevel + 0.9;
      body.castShadow = true;
      shrine.add(body);

      // Pillars
      const pOffset = 1.3;
      for (const px of [-1, 1]) {
        for (const pz of [-1, 1]) {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.0, 8), woodMat);
          pillar.position.set(px * pOffset, baseLevel + 1.0, pz * pOffset);
          pillar.castShadow = true;
          shrine.add(pillar);
        }
      }

      // Roof base
      const roofBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 3.2), woodMat);
      roofBase.position.y = baseLevel + 2.0;
      shrine.add(roofBase);

      // Main curved roof
      const roofGeo = new THREE.ConeGeometry(2.6, 1.5, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = baseLevel + 2.75;
      roof.castShadow = true;
      shrine.add(roof);

      // Gold ornament top
      const ornament = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), goldMat);
      ornament.position.y = baseLevel + 3.6;
      shrine.add(ornament);

      // Paper ropes (Shimenawa) - simple cylinders across front
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0xddccaa }));
      rope.rotation.z = Math.PI / 2;
      rope.position.set(0, baseLevel + 1.8, 1.4);
      shrine.add(rope);

      return shrine;
    };

    // Place a couple of decorative shrines in the courtyard
    const positions = [
      { x: -12, z: 25, rotY: Math.PI / 4 },
      { x: 12, z: 25, rotY: -Math.PI / 4 }
    ];

    positions.forEach(pos => {
      const shrine = createShrine();
      shrine.position.set(pos.x, 0, pos.z);
      shrine.rotation.y = pos.rotY;
      group.add(shrine);

      // Register collision box for the shrine base (approximate)
      collisionSystem.addBox(new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(pos.x, 2, pos.z),
        new THREE.Vector3(4, 4, 4)
      ));
    });

    // Place the Main Interactable Shrine in the Shrine Area
    const mainShrine = createShrine();
    mainShrine.position.set(0, 0, -10);
    mainShrine.scale.setScalar(1.2);
    group.add(mainShrine);

    collisionSystem.addBox(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(0, 2, -10),
      new THREE.Vector3(5, 5, 5)
    ));

    return group;
  }
}
