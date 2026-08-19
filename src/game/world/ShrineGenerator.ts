import * as THREE from 'three';
import { createStoneMaterial, createWoodMaterial, createRoofMaterial, createCrimsonMaterial } from '../utils/MaterialUtils';

export class ShrineGenerator {
  public static create(): THREE.Group {
    const shrine = new THREE.Group();
    const stone = createStoneMaterial();
    const wood = createWoodMaterial();
    const roof = createRoofMaterial();
    const crimson = createCrimsonMaterial();

    // Foundation
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 2), stone);
    base.position.y = 0.25;
    base.castShadow = true; base.receiveShadow = true;
    shrine.add(base);

    // Four small pillars
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), crimson);
        p.position.set(sx * 0.9, 1.6, sz * 0.7);
        p.castShadow = true;
        shrine.add(p);
      }
    }

    // Body (enclosed box)
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.2), wood);
    body.position.set(0, 1.5, 0);
    body.castShadow = true;
    shrine.add(body);

    // Offering slot (dark recess)
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
    );
    slot.position.set(0, 1.3, 0.61);
    shrine.add(slot);

    // Roof
    const roofGeo = new THREE.ConeGeometry(1.8, 1.0, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMesh = new THREE.Mesh(roofGeo, roof);
    roofMesh.position.y = 3.0;
    roofMesh.castShadow = true;
    shrine.add(roofMesh);

    // Roof finial
    const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), stone);
    finial.position.y = 3.6;
    shrine.add(finial);

    return shrine;
  }
}
