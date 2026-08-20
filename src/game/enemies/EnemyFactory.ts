import * as THREE from 'three';
import { CharacterRig } from '../characters/CharacterRig';

// ─── Basic Yokai Materials ──────────────────────────────────────────────────
const darkSkinMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.9 });
const clothMat = new THREE.MeshStandardMaterial({ color: 0x221133, roughness: 1.0 }); // ragged purple
const hornMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 });
const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xaa1100, emissiveIntensity: 2.0 });
const clawMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.2 });

// ─── Shadow Yokai Materials ─────────────────────────────────────────────────
const shadowSkinMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.95 });
const shadowClothMat = new THREE.MeshStandardMaterial({ color: 0x0a1520, roughness: 1.0 });
const shadowAccentMat = new THREE.MeshStandardMaterial({ color: 0x1a0a0a, roughness: 0.8 }); // muted crimson
const shadowHornMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.3, metalness: 0.2 });
const shadowEyeMat = new THREE.MeshStandardMaterial({
  color: 0x00aacc, emissive: 0x0088aa, emissiveIntensity: 3.0
});
const shadowClawMat = new THREE.MeshStandardMaterial({
  color: 0x112233, emissive: 0x003344, emissiveIntensity: 1.0, roughness: 0.1
});

export class EnemyFactory {
  public static createBasicYokai(): CharacterRig {
    const rig = new CharacterRig();

    const addMesh = (parent: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, yOffset = 0) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = yOffset;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Make Yokai hunched and broad
    const pelvisGeo = new THREE.BoxGeometry(0.4, 0.2, 0.3);
    const spineGeo = new THREE.BoxGeometry(0.35, 0.25, 0.3);
    const chestGeo = new THREE.BoxGeometry(0.6, 0.45, 0.4); // Very broad
    
    // Taper chest heavily
    const cPos = chestGeo.attributes.position;
    for(let i=0; i<cPos.count; i++) {
      if (cPos.getY(i) < 0) {
        cPos.setX(i, cPos.getX(i) * 0.6); // Narrow at the waist
      }
    }
    chestGeo.computeVertexNormals();

    const headGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    // Horns
    const hornGeo = new THREE.ConeGeometry(0.04, 0.15, 4);
    hornGeo.translate(0, 0.075, 0);

    const lHorn = new THREE.Mesh(hornGeo, hornMat);
    lHorn.position.set(0.1, 0.1, 0);
    lHorn.rotation.z = -0.3;
    lHorn.rotation.x = -0.2;
    
    const rHorn = new THREE.Mesh(hornGeo, hornMat);
    rHorn.position.set(-0.1, 0.1, 0);
    rHorn.rotation.z = 0.3;
    rHorn.rotation.x = -0.2;
    
    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.04, 0.02, 0.01);
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(0.06, 0.02, 0.13);
    lEye.rotation.z = 0.1;

    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(-0.06, 0.02, 0.13);
    rEye.rotation.z = -0.1;

    // Arms (Elongated)
    const upperArmGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    upperArmGeo.translate(0, -0.25, 0);
    
    const lowerArmGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
    lowerArmGeo.translate(0, -0.25, 0);
    
    const handGeo = new THREE.BoxGeometry(0.18, 0.25, 0.18);
    handGeo.translate(0, -0.125, 0);

    // Claws
    const clawGeo = new THREE.ConeGeometry(0.02, 0.15, 3);
    clawGeo.translate(0, -0.075, 0);
    const addClaws = (hand: THREE.Object3D) => {
      for (let i = -1; i <= 1; i++) {
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set(i * 0.06, -0.2, 0.05);
        claw.rotation.x = -0.2;
        hand.add(claw);
      }
    };

    // Legs (Bent/Squat)
    const upperLegGeo = new THREE.BoxGeometry(0.2, 0.45, 0.2);
    upperLegGeo.translate(0, -0.225, 0);
    
    const lowerLegGeo = new THREE.BoxGeometry(0.16, 0.4, 0.16);
    lowerLegGeo.translate(0, -0.2, 0);
    
    const footGeo = new THREE.BoxGeometry(0.15, 0.1, 0.3);
    footGeo.translate(0, -0.05, 0.05);

    // Assembly
    addMesh(rig.pelvis, pelvisGeo, clothMat);
    addMesh(rig.spine, spineGeo, darkSkinMat);
    addMesh(rig.chest, chestGeo, darkSkinMat);
    
    const headMesh = addMesh(rig.head, headGeo, darkSkinMat, 0.125);
    headMesh.add(lHorn, rHorn, lEye, rEye);

    // Adjust rig proportions for long arms
    rig.leftUpperArm.position.set(0.35, 0.15, 0);
    rig.rightUpperArm.position.set(-0.35, 0.15, 0);
    rig.leftLowerArm.position.set(0, -0.5, 0);
    rig.rightLowerArm.position.set(0, -0.5, 0);
    rig.leftHand.position.set(0, -0.5, 0);
    rig.rightHand.position.set(0, -0.5, 0);

    addMesh(rig.leftUpperArm, upperArmGeo, clothMat);
    addMesh(rig.rightUpperArm, upperArmGeo, clothMat);
    addMesh(rig.leftLowerArm, lowerArmGeo, darkSkinMat);
    addMesh(rig.rightLowerArm, lowerArmGeo, darkSkinMat);
    
    const lHand = addMesh(rig.leftHand, handGeo, darkSkinMat);
    const rHand = addMesh(rig.rightHand, handGeo, darkSkinMat);
    addClaws(lHand);
    addClaws(rHand);

    addMesh(rig.leftUpperLeg, upperLegGeo, clothMat);
    addMesh(rig.rightUpperLeg, upperLegGeo, clothMat);
    addMesh(rig.leftLowerLeg, lowerLegGeo, darkSkinMat);
    addMesh(rig.rightLowerLeg, lowerLegGeo, darkSkinMat);
    addMesh(rig.leftFoot, footGeo, darkSkinMat);
    addMesh(rig.rightFoot, footGeo, darkSkinMat);

    // Rescale entirely to make it imposing
    rig.root.scale.set(1.2, 1.2, 1.2);

    return rig;
  }

  // ─── Shadow Yokai ─────────────────────────────────────────────────────────

  public static createShadowYokai(): CharacterRig {
    const rig = new CharacterRig();

    const addMesh = (parent: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, yOffset = 0) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = yOffset;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // ── Torso: tall, narrow, angular ──
    const pelvisGeo = new THREE.BoxGeometry(0.25, 0.15, 0.2);
    const spineGeo = new THREE.BoxGeometry(0.2, 0.35, 0.18);
    // Elongated narrow chest
    const chestGeo = new THREE.BoxGeometry(0.35, 0.55, 0.25);
    // Taper: narrow at waist, angular at shoulders
    const cPos = chestGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const y = cPos.getY(i);
      if (y < 0) {
        cPos.setX(i, cPos.getX(i) * 0.5);
        cPos.setZ(i, cPos.getZ(i) * 0.6);
      } else {
        // Sharp angular shoulders
        cPos.setX(i, cPos.getX(i) * 1.3);
      }
    }
    chestGeo.computeVertexNormals();

    // ── Head: angular, slightly elongated ──
    const headGeo = new THREE.BoxGeometry(0.18, 0.22, 0.2);
    // Taper top of head
    const hPos = headGeo.attributes.position;
    for (let i = 0; i < hPos.count; i++) {
      if (hPos.getY(i) > 0) {
        hPos.setX(i, hPos.getX(i) * 0.7);
        hPos.setZ(i, hPos.getZ(i) * 0.8);
      }
    }
    headGeo.computeVertexNormals();

    // Tall swept-back horns
    const hornGeo = new THREE.ConeGeometry(0.03, 0.3, 4);
    hornGeo.translate(0, 0.15, 0);
    const lHorn = new THREE.Mesh(hornGeo, shadowHornMat);
    lHorn.position.set(0.08, 0.1, -0.03);
    lHorn.rotation.z = -0.4;
    lHorn.rotation.x = -0.5;
    const rHorn = new THREE.Mesh(hornGeo, shadowHornMat);
    rHorn.position.set(-0.08, 0.1, -0.03);
    rHorn.rotation.z = 0.4;
    rHorn.rotation.x = -0.5;

    // Third central horn (shadow protrusion)
    const centralHornGeo = new THREE.ConeGeometry(0.02, 0.2, 3);
    centralHornGeo.translate(0, 0.1, 0);
    const centralHorn = new THREE.Mesh(centralHornGeo, shadowHornMat);
    centralHorn.position.set(0, 0.12, -0.05);
    centralHorn.rotation.x = -0.6;

    // Narrow glowing eyes
    const eyeGeo = new THREE.BoxGeometry(0.05, 0.015, 0.01);
    const lEye = new THREE.Mesh(eyeGeo, shadowEyeMat);
    lEye.position.set(0.04, 0.03, 0.1);
    const rEye = new THREE.Mesh(eyeGeo, shadowEyeMat);
    rEye.position.set(-0.04, 0.03, 0.1);

    // ── Arms: very elongated, thin ──
    const upperArmGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
    upperArmGeo.translate(0, -0.3, 0);
    const lowerArmGeo = new THREE.BoxGeometry(0.06, 0.6, 0.06);
    lowerArmGeo.translate(0, -0.3, 0);
    // Narrow hands
    const handGeo = new THREE.BoxGeometry(0.1, 0.2, 0.08);
    handGeo.translate(0, -0.1, 0);

    // Long sharp fingers (5 per hand)
    const fingerGeo = new THREE.ConeGeometry(0.012, 0.18, 3);
    fingerGeo.translate(0, -0.09, 0);
    const addFingers = (hand: THREE.Object3D) => {
      for (let i = -2; i <= 2; i++) {
        const finger = new THREE.Mesh(fingerGeo, shadowClawMat);
        finger.position.set(i * 0.02, -0.15, 0.02);
        finger.rotation.x = -0.15;
        hand.add(finger);
      }
    };

    // ── Legs: long, thin ──
    const upperLegGeo = new THREE.BoxGeometry(0.12, 0.55, 0.12);
    upperLegGeo.translate(0, -0.275, 0);
    const lowerLegGeo = new THREE.BoxGeometry(0.09, 0.5, 0.09);
    lowerLegGeo.translate(0, -0.25, 0);
    const footGeo = new THREE.BoxGeometry(0.1, 0.06, 0.2);
    footGeo.translate(0, -0.03, 0.05);

    // ── Shadow cloth wisps ──
    const wispMat = new THREE.MeshBasicMaterial({
      color: 0x0a1520, transparent: true, opacity: 0.3,
      side: THREE.DoubleSide, depthWrite: false
    });
    const addWisps = (parent: THREE.Group, count: number, yBase: number) => {
      for (let i = 0; i < count; i++) {
        const w = 0.15 + Math.random() * 0.15;
        const h = 0.3 + Math.random() * 0.4;
        const wisp = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wispMat);
        wisp.position.set(
          (Math.random() - 0.5) * 0.3,
          yBase - h / 2,
          (Math.random() - 0.5) * 0.15
        );
        wisp.rotation.y = Math.random() * Math.PI;
        parent.add(wisp);
      }
    };

    // ── Assembly ──
    addMesh(rig.pelvis, pelvisGeo, shadowClothMat);
    addMesh(rig.spine, spineGeo, shadowSkinMat);
    addMesh(rig.chest, chestGeo, shadowSkinMat);

    // Crimson accent sash across chest
    const sashGeo = new THREE.BoxGeometry(0.38, 0.05, 0.27);
    addMesh(rig.chest, sashGeo, shadowAccentMat, 0.05);

    const headMesh = addMesh(rig.head, headGeo, shadowSkinMat, 0.11);
    headMesh.add(lHorn, rHorn, centralHorn, lEye, rEye);

    // Longer arm reach
    rig.leftUpperArm.position.set(0.25, 0.2, 0);
    rig.rightUpperArm.position.set(-0.25, 0.2, 0);
    rig.leftLowerArm.position.set(0, -0.6, 0);
    rig.rightLowerArm.position.set(0, -0.6, 0);
    rig.leftHand.position.set(0, -0.6, 0);
    rig.rightHand.position.set(0, -0.6, 0);

    addMesh(rig.leftUpperArm, upperArmGeo, shadowClothMat);
    addMesh(rig.rightUpperArm, upperArmGeo, shadowClothMat);
    addMesh(rig.leftLowerArm, lowerArmGeo, shadowSkinMat);
    addMesh(rig.rightLowerArm, lowerArmGeo, shadowSkinMat);

    const lHand = addMesh(rig.leftHand, handGeo, shadowSkinMat);
    const rHand = addMesh(rig.rightHand, handGeo, shadowSkinMat);
    addFingers(lHand);
    addFingers(rHand);

    // Legs
    rig.leftUpperLeg.position.set(0.08, -0.1, 0);
    rig.rightUpperLeg.position.set(-0.08, -0.1, 0);
    rig.leftLowerLeg.position.set(0, -0.55, 0);
    rig.rightLowerLeg.position.set(0, -0.55, 0);

    addMesh(rig.leftUpperLeg, upperLegGeo, shadowClothMat);
    addMesh(rig.rightUpperLeg, upperLegGeo, shadowClothMat);
    addMesh(rig.leftLowerLeg, lowerLegGeo, shadowSkinMat);
    addMesh(rig.rightLowerLeg, lowerLegGeo, shadowSkinMat);
    addMesh(rig.leftFoot, footGeo, shadowSkinMat);
    addMesh(rig.rightFoot, footGeo, shadowSkinMat);

    // Cloth wisps from pelvis and chest
    addWisps(rig.pelvis, 4, -0.1);
    addWisps(rig.chest, 2, -0.2);

    // Taller, thinner silhouette — scale Y more than XZ
    rig.root.scale.set(0.9, 1.3, 0.9);

    // Raise pelvis for longer legs
    rig.pelvis.position.set(0, 1.2, 0);

    return rig;
  }
}
