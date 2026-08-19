import * as THREE from 'three';
import { createWoodMaterial, createRoofMaterial, createCrimsonMaterial, createStoneMaterial, createLightStoneMaterial } from '../utils/MaterialUtils';

export class TempleGenerator {
  public static create(): THREE.Group {
    const temple = new THREE.Group();
    const wood = createWoodMaterial();
    const roofMat = createRoofMaterial();
    const stone = createStoneMaterial();
    const lightStone = createLightStoneMaterial();
    const crimson = createCrimsonMaterial();

    // Foundation - raised stone platform
    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(12, 1.2, 8), stone
    );
    foundation.position.y = 0.6;
    foundation.castShadow = true; foundation.receiveShadow = true;
    temple.add(foundation);

    // Steps
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(4 - i * 0.3, 0.3, 1), lightStone
      );
      step.position.set(0, i * 0.3 + 0.15, 4.5 - i * 0.3);
      step.castShadow = true;
      temple.add(step);
    }

    // Pillars
    const pillarPositions = [
      [-5, 3.5], [-2.5, 3.5], [2.5, 3.5], [5, 3.5],
      [-5, -3.5], [-2.5, -3.5], [2.5, -3.5], [5, -3.5],
    ];
    pillarPositions.forEach(([x, z]) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 5, 8), crimson
      );
      pillar.position.set(x, 3.7, z);
      pillar.castShadow = true;
      temple.add(pillar);
    });

    // Walls (back and sides)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(11, 4, 0.3), wood);
    backWall.position.set(0, 4.2, -3.5);
    backWall.castShadow = true;
    temple.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 7), wood);
    leftWall.position.set(-5.5, 4.2, 0);
    leftWall.castShadow = true;
    temple.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 7), wood);
    rightWall.position.set(5.5, 4.2, 0);
    rightWall.castShadow = true;
    temple.add(rightWall);

    // Main roof (curved shape via multiple layers)
    for (let layer = 0; layer < 3; layer++) {
      const scale = 1 - layer * 0.25;
      const roofWidth = 14 * scale;
      const roofDepth = 10 * scale;
      const roofHeight = 1.5;
      const yOff = 6.2 + layer * 1.8;

      // Trapezoidal roof approximation
      const roofGeo = new THREE.ConeGeometry(
        Math.max(roofWidth, roofDepth) * 0.55, roofHeight, 4
      );
      roofGeo.rotateY(Math.PI / 4);
      roofGeo.scale(roofWidth / roofDepth, 1, 1);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = yOff;
      roof.castShadow = true;
      temple.add(roof);

      // Roof rim decoration
      if (layer < 2) {
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(roofWidth * 0.42, 0.08, 4, 4), crimson
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.y = yOff - 0.5;
        temple.add(rim);
      }
    }

    // Door opening (dark recess)
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2, 3.5, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x050505 })
    );
    doorFrame.position.set(0, 4, 3.5);
    temple.add(doorFrame);

    return temple;
  }
}
