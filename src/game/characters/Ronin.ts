import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';
import { createSkinMaterial, createClothMaterial, createCrimsonMaterial, createLeatherMaterial, createMetalMaterial, createBladeMaterial, createDarkWoodMaterial } from '../utils/MaterialUtils';

export class Ronin {
  public rig: CharacterRig;
  public katana: THREE.Group;

  constructor() {
    this.rig = new CharacterRig();
    this.rig.setupProportions(1.8);
    this.katana = new THREE.Group();
    this.buildBody();
    this.buildKatana();
  }

  private buildBody(): void {
    const b = this.rig.bones;
    const skin = createSkinMaterial();
    const cloth = createClothMaterial(0x1a1a22);
    const crimson = createCrimsonMaterial();
    const armor = createLeatherMaterial();
    const metal = createMetalMaterial();

    // Head
    const headGeo = new THREE.SphereGeometry(0.12, 8, 6);
    headGeo.scale(1, 1.1, 0.95);
    const head = new THREE.Mesh(headGeo, skin);
    head.castShadow = true;
    b.head.add(head);

    // Hair (topknot silhouette)
    const hairBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 6, 4), createClothMaterial(0x0a0a0a)
    );
    hairBase.position.y = 0.06;
    hairBase.scale.set(1, 0.6, 1);
    b.head.add(hairBase);

    // Topknot
    const topknot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 0.12, 4),
      createClothMaterial(0x0a0a0a)
    );
    topknot.position.set(0, 0.12, -0.02);
    topknot.rotation.x = -0.3;
    b.head.add(topknot);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 6), skin);
    b.neck.add(neck);

    // Torso (chest)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.16), cloth);
    torso.castShadow = true;
    b.chest.add(torso);

    // Spine
    const spineGeo = new THREE.BoxGeometry(0.24, 0.16, 0.14);
    const spineMesh = new THREE.Mesh(spineGeo, cloth);
    spineMesh.castShadow = true;
    b.spine.add(spineMesh);

    // Pelvis / waist
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.14), cloth);
    b.pelvis.add(waist);

    // Shoulder armor (left and right)
    for (const [bone, side] of [[b.leftUpperArm, -1], [b.rightUpperArm, 1]] as [THREE.Group, number][]) {
      const shoulderPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.06, 0.12), armor
      );
      shoulderPad.position.set(side * 0.02, 0.04, 0);
      shoulderPad.castShadow = true;
      bone.add(shoulderPad);
    }

    // Chest armor plate
    const chestPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.12, 0.02), metal
    );
    chestPlate.position.set(0, -0.02, 0.09);
    b.chest.add(chestPlate);

    // Crimson sash
    const sash = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.04, 0.16), crimson
    );
    sash.position.y = 0.06;
    b.pelvis.add(sash);

    // Waist cloth (hanging cloth)
    const waistCloth = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.15, 0.02), cloth
    );
    waistCloth.position.set(0, -0.05, 0.08);
    b.pelvis.add(waistCloth);

    const waistClothBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.02), cloth
    );
    waistClothBack.position.set(0, -0.06, -0.08);
    b.pelvis.add(waistClothBack);

    // Arms
    for (const [upper, lower, hand] of [
      [b.leftUpperArm, b.leftLowerArm, b.leftHand],
      [b.rightUpperArm, b.rightLowerArm, b.rightHand],
    ]) {
      const ua = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.25, 6), cloth);
      ua.position.y = -0.12;
      ua.castShadow = true;
      upper.add(ua);

      const la = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.22, 6), skin);
      la.position.y = -0.1;
      la.castShadow = true;
      lower.add(la);

      const h = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), skin);
      hand.add(h);
    }

    // Legs
    for (const [upper, lower, foot] of [
      [b.leftUpperLeg, b.leftLowerLeg, b.leftFoot],
      [b.rightUpperLeg, b.rightLowerLeg, b.rightFoot],
    ]) {
      const ul = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.43, 6), cloth);
      ul.position.y = -0.21;
      ul.castShadow = true;
      upper.add(ul);

      const ll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.43, 6), cloth);
      ll.position.y = -0.21;
      ll.castShadow = true;
      lower.add(ll);

      // Boots
      const boot = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.04, 0.12), armor
      );
      boot.position.set(0, 0, 0.02);
      foot.add(boot);
    }
  }

  private buildKatana(): void {
    const b = this.rig.bones;
    this.katana = new THREE.Group();

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.015, 0.55, 0.04);
    const blade = new THREE.Mesh(bladeGeo, createBladeMaterial());
    blade.position.y = -0.3;
    blade.castShadow = true;
    this.katana.add(blade);

    // Guard (tsuba)
    const guard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.015, 6),
      createMetalMaterial()
    );
    guard.rotation.x = Math.PI / 2;
    guard.position.y = -0.03;
    this.katana.add(guard);

    // Handle (tsuka)
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.02, 0.16, 6),
      createDarkWoodMaterial()
    );
    handle.position.y = 0.06;
    this.katana.add(handle);

    // Pommel
    const pommel = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 5, 4), createMetalMaterial()
    );
    pommel.position.y = 0.14;
    this.katana.add(pommel);

    // Crimson wrap on handle
    const wrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.021, 0.004, 4, 12),
      createCrimsonMaterial()
    );
    wrap.position.y = 0.06;
    wrap.rotation.x = Math.PI / 2;
    this.katana.add(wrap);

    // Attach to right hand
    b.rightHand.add(this.katana);
  }
}
