import * as THREE from 'three';
import { createStoneMaterial, createLightStoneMaterial, createEmissiveMaterial, createRoofMaterial } from '../utils/MaterialUtils';

export class LanternGenerator {
  public static create(variation: number = 0): THREE.Group {
    const lantern = new THREE.Group();
    const stone = createStoneMaterial();
    const lightStone = createLightStoneMaterial();
    const roofMat = createRoofMaterial();

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.3, 6), stone);
    base.position.y = 0.15;
    base.castShadow = true;
    lantern.add(base);

    // Pillar
    const pillarH = 1.0 + variation * 0.3;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, pillarH, 6), lightStone
    );
    pillar.position.y = 0.3 + pillarH / 2;
    pillar.castShadow = true;
    lantern.add(pillar);

    // Light chamber
    const chamberY = 0.3 + pillarH + 0.3;
    const chamber = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.5, 0.4), lightStone
    );
    chamber.position.y = chamberY;
    chamber.castShadow = true;
    lantern.add(chamber);

    // Emissive light inside
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 4),
      createEmissiveMaterial(0xffaa44, 2.0)
    );
    glow.position.y = chamberY;
    lantern.add(glow);

    // Roof cap
    const roofGeo = new THREE.ConeGeometry(0.4, 0.35, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = chamberY + 0.42;
    roof.castShadow = true;
    lantern.add(roof);

    // Point light for warm glow
    const light = new THREE.PointLight(0xffaa44, 1.5, 8);
    light.position.y = chamberY;
    lantern.add(light);

    return lantern;
  }
}
