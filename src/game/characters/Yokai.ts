import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';
import { createYokaiSkinMaterial, createClothMaterial, createCrimsonMaterial } from '../utils/MaterialUtils';

export class Yokai {
  public rig: CharacterRig;

  constructor() {
    this.rig = new CharacterRig();
    // Yokai are slightly hunched and larger
    this.rig.setupProportions(2.0);
    this.buildBody();
  }

  private buildBody(): void {
    const b = this.rig.bones;
    const skin = createYokaiSkinMaterial();
    const cloth = createClothMaterial(0x12081a);
    const crimson = createCrimsonMaterial();

    // Head - elongated and menacing
    const headGeo = new THREE.SphereGeometry(0.14, 7, 5);
    headGeo.scale(1, 1.2, 1.1);
    const head = new THREE.Mesh(headGeo, skin);
    head.castShadow = true;
    b.head.add(head);

    // Horns
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(0.03, 0.18, 5), skin
      );
      horn.position.set(side * 0.08, 0.12, 0);
      horn.rotation.z = side * -0.4;
      horn.castShadow = true;
      b.head.add(horn);
    }

    // Crimson eyes (two small emissive spheres)
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 4, 3),
        new THREE.MeshBasicMaterial({ color: 0xff2200 })
      );
      eye.position.set(side * 0.05, 0.02, 0.12);
      b.head.add(eye);
    }

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 6), skin);
    b.neck.add(neck);

    // Torso - hunched and broad
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.2), cloth);
    torso.castShadow = true;
    b.chest.add(torso);

    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.18), cloth);
    spine.castShadow = true;
    b.spine.add(spine);

    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.16), cloth);
    b.pelvis.add(waist);

    // Ragged cloth hanging
    const rag = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.2, 0.02), cloth
    );
    rag.position.set(0, -0.08, 0.09);
    b.pelvis.add(rag);

    // Arms - elongated limbs
    for (const [upper, lower, hand] of [
      [b.leftUpperArm, b.leftLowerArm, b.leftHand],
      [b.rightUpperArm, b.rightLowerArm, b.rightHand],
    ]) {
      const ua = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.3, 6), skin);
      ua.position.y = -0.15;
      ua.castShadow = true;
      upper.add(ua);

      const la = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.28, 6), skin);
      la.position.y = -0.14;
      la.castShadow = true;
      lower.add(la);

      // Claws
      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(
          new THREE.ConeGeometry(0.01, 0.06, 3), skin
        );
        claw.position.set(c * 0.015, -0.03, 0);
        claw.rotation.x = -0.3;
        hand.add(claw);
      }
    }

    // Legs
    for (const [upper, lower, foot] of [
      [b.leftUpperLeg, b.leftLowerLeg, b.leftFoot],
      [b.rightUpperLeg, b.rightLowerLeg, b.rightFoot],
    ]) {
      const ul = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.46, 6), cloth);
      ul.position.y = -0.23;
      ul.castShadow = true;
      upper.add(ul);

      const ll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.46, 6), skin);
      ll.position.y = -0.23;
      ll.castShadow = true;
      lower.add(ll);

      const ft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.14), skin);
      ft.position.set(0, 0, 0.02);
      foot.add(ft);
    }

    // Apply hunched posture in default rest pose
    b.chest.rotation.x = 0.2;
    b.neck.rotation.x = -0.1;
    b.leftUpperArm.rotation.z = 0.15;
    b.rightUpperArm.rotation.z = -0.15;
  }
}
