import * as THREE from 'three';
import { createCrimsonMaterial, createDarkWoodMaterial } from '../utils/MaterialUtils';

export class ToriiGenerator {
  public static create(height: number = 6): THREE.Group {
    const torii = new THREE.Group();
    const wood = createDarkWoodMaterial();
    const crimson = createCrimsonMaterial();
    const hw = 3; // half-width

    // Two vertical pillars
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, height, 8), crimson
      );
      pillar.position.set(side * hw, height / 2, 0);
      pillar.castShadow = true;
      torii.add(pillar);

      // Pillar base stone
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 })
      );
      base.position.set(side * hw, 0.15, 0);
      torii.add(base);
    }

    // Lower crossbeam (nuki)
    const lowerBeam = new THREE.Mesh(
      new THREE.BoxGeometry(hw * 2 + 0.6, 0.25, 0.25), wood
    );
    lowerBeam.position.set(0, height * 0.65, 0);
    lowerBeam.castShadow = true;
    torii.add(lowerBeam);

    // Upper crossbeam (kasagi)
    const upperBeam = new THREE.Mesh(
      new THREE.BoxGeometry(hw * 2.4, 0.3, 0.35), crimson
    );
    upperBeam.position.set(0, height, 0);
    upperBeam.castShadow = true;
    torii.add(upperBeam);

    // Curved top (shimaki) - approximated with a thin curved shape
    const curveShape = new THREE.Shape();
    const cw = hw * 1.35;
    curveShape.moveTo(-cw, 0);
    curveShape.quadraticCurveTo(0, 0.7, cw, 0);
    curveShape.lineTo(cw, -0.15);
    curveShape.quadraticCurveTo(0, 0.5, -cw, -0.15);
    curveShape.closePath();
    const curveGeo = new THREE.ExtrudeGeometry(curveShape, {
      depth: 0.4, bevelEnabled: false,
    });
    const curveTop = new THREE.Mesh(curveGeo, crimson);
    curveTop.position.set(0, height + 0.15, -0.2);
    curveTop.castShadow = true;
    torii.add(curveTop);

    return torii;
  }
}
