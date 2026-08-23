import * as THREE from 'three';
import { CharacterRig } from '../characters/CharacterRig';

// ─── Basic Yokai Materials ──────────────────────────────────────────────────
const yokaiSkinMat = new THREE.MeshStandardMaterial({ color: 0x242a35, roughness: 0.8 }); // Dark slate/blue
const yokaiClothMat = new THREE.MeshStandardMaterial({ color: 0x1f1b18, roughness: 1.0 }); // Dark, distressed brown/charcoal
const yokaiRopeMat = new THREE.MeshStandardMaterial({ color: 0x5a4a35, roughness: 0.9, flatShading: true }); // Twisted rope
const yokaiHornMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.6 }); // Bone
const yokaiEyeMat = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xcc0000, emissiveIntensity: 2.0 });
const yokaiClawMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
const yokaiHairMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 }); // Messy black hair

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

// ─── Tengu Materials ────────────────────────────────────────────────────────
const tenguSkinMat = new THREE.MeshStandardMaterial({ color: 0x552222, roughness: 0.8 });
const tenguFeatherMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.9, flatShading: true });
const tenguBeakMat = new THREE.MeshStandardMaterial({ color: 0xcc9933, roughness: 0.5, metalness: 0.1 });
const tenguClothMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 1.0 }); // dark robes
const tenguAccentMat = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.6 }); // red accents
const tenguEyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 2.0 });

export class EnemyFactory {
  public static createBasicYokai(): CharacterRig {
    const rig = new CharacterRig();

    const addMesh = (parent: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, yOffset = 0, xOffset = 0, zOffset = 0) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(xOffset, yOffset, zOffset);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // ─── Proportions & Base ──────────────────────────────────────────────
    // Taller, slender, slightly hunched
    const scale = 1.15;
    rig.root.scale.set(scale, scale, scale);
    rig.pelvis.position.set(0, 1.1, 0);

    // ─── Torso ──────────────────────────────────────────────────────────
    // Gaunt waist/pelvis
    const pelvisGeo = new THREE.BoxGeometry(0.35, 0.25, 0.25);
    addMesh(rig.pelvis, pelvisGeo, yokaiClothMat); // Pants start here
    
    // Spine (bare stomach)
    const spineGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.35, 6);
    addMesh(rig.spine, spineGeo, yokaiSkinMat, 0.15);

    // Chest (gaunt but muscular)
    const chestGeo = new THREE.BoxGeometry(0.45, 0.4, 0.3);
    const cPos = chestGeo.attributes.position;
    for(let i=0; i<cPos.count; i++) {
      if (cPos.getY(i) < 0) {
        cPos.setX(i, cPos.getX(i) * 0.7); // Narrow at the waist
      }
    }
    chestGeo.computeVertexNormals();
    addMesh(rig.chest, chestGeo, yokaiSkinMat, 0.2);

    // Ribs (simulated with thin boxes on the chest)
    const ribGeo = new THREE.BoxGeometry(0.42, 0.04, 0.32);
    for (let i = 0; i < 3; i++) {
      addMesh(rig.chest, ribGeo, yokaiSkinMat, 0.05 + (i * 0.1));
    }

    // ─── Clothing (Left Shoulder Drape & Rope Belt) ─────────────────────
    // Rope belt
    const beltGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 16);
    beltGeo.rotateX(Math.PI / 2);
    addMesh(rig.pelvis, beltGeo, yokaiRopeMat, 0.12);
    // Knot ends hanging
    const knotGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5);
    const lKnot = addMesh(rig.pelvis, knotGeo, yokaiRopeMat, 0, 0.05, 0.22);
    lKnot.rotation.x = 0.2; lKnot.rotation.z = 0.1;
    const rKnot = addMesh(rig.pelvis, knotGeo, yokaiRopeMat, 0, -0.05, 0.22);
    rKnot.rotation.x = 0.3; rKnot.rotation.z = -0.1;

    // Left shoulder cloth drape
    const drapeGeo = new THREE.BoxGeometry(0.25, 0.4, 0.35);
    const drape = addMesh(rig.chest, drapeGeo, yokaiClothMat, 0.2, 0.18, 0);
    drape.rotation.z = -0.3;
    // Lower drape hanging down back
    const backDrapeGeo = new THREE.BoxGeometry(0.2, 0.5, 0.1);
    const bDrape = addMesh(rig.chest, backDrapeGeo, yokaiClothMat, -0.1, 0.18, -0.15);
    bDrape.rotation.x = 0.2;
    
    // ─── Head & Face ────────────────────────────────────────────────────
    const headGeo = new THREE.BoxGeometry(0.22, 0.28, 0.24);
    const headPos = headGeo.attributes.position;
    for(let i=0; i<headPos.count; i++) {
      if(headPos.getY(i) < 0) {
        headPos.setX(i, headPos.getX(i)*0.8); // tapered chin
        headPos.setZ(i, headPos.getZ(i)*0.8);
      }
    }
    headGeo.computeVertexNormals();
    const headMesh = addMesh(rig.head, headGeo, yokaiSkinMat, 0.15);

    // Glowing red eyes (sunken)
    const eyeGeo = new THREE.BoxGeometry(0.05, 0.02, 0.01);
    const lEye = new THREE.Mesh(eyeGeo, yokaiEyeMat);
    lEye.position.set(0.05, 0.03, 0.12); lEye.rotation.z = 0.1;
    const rEye = new THREE.Mesh(eyeGeo, yokaiEyeMat);
    rEye.position.set(-0.05, 0.03, 0.12); rEye.rotation.z = -0.1;
    headMesh.add(lEye, rEye);
    // Brow ridge (angry)
    const browGeo = new THREE.BoxGeometry(0.18, 0.03, 0.04);
    addMesh(headMesh, browGeo, yokaiSkinMat, 0.06, 0, 0.11).rotation.x = 0.1;

    // Elf ears
    const earGeo = new THREE.ConeGeometry(0.03, 0.15, 3);
    const lEar = new THREE.Mesh(earGeo, yokaiSkinMat);
    lEar.position.set(0.12, 0, 0); lEar.rotation.z = -1.2; lEar.rotation.x = -0.2;
    const rEar = new THREE.Mesh(earGeo, yokaiSkinMat);
    rEar.position.set(-0.12, 0, 0); rEar.rotation.z = 1.2; rEar.rotation.x = -0.2;
    headMesh.add(lEar, rEar);

    // Backward curving horns
    const hornGeo = new THREE.ConeGeometry(0.03, 0.18, 6);
    hornGeo.translate(0, 0.09, 0);
    const lHorn = new THREE.Mesh(hornGeo, yokaiHornMat);
    lHorn.position.set(0.06, 0.12, 0); lHorn.rotation.x = -0.6; lHorn.rotation.z = -0.2;
    const rHorn = new THREE.Mesh(hornGeo, yokaiHornMat);
    rHorn.position.set(-0.06, 0.12, 0); rHorn.rotation.x = -0.6; rHorn.rotation.z = 0.2;
    headMesh.add(lHorn, rHorn);

    // Messy hair (multiple hanging boxes/cones)
    const hairGeo = new THREE.ConeGeometry(0.04, 0.4, 3);
    hairGeo.translate(0, -0.2, 0);
    for (let i = 0; i < 8; i++) {
      const hair = new THREE.Mesh(hairGeo, yokaiHairMat);
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 0.1;
      const z = Math.sin(angle) * 0.1 - 0.05; // biased towards back
      hair.position.set(x, 0.15, z);
      hair.rotation.x = z < 0 ? 0.3 : 0; // hang backwards
      hair.rotation.z = x * 2;
      headMesh.add(hair);
    }

    // ─── Arms (Elongated, clawed hands) ─────────────────────────────────
    rig.leftUpperArm.position.set(0.28, 0.35, 0); // wider shoulders
    rig.rightUpperArm.position.set(-0.28, 0.35, 0);
    rig.leftLowerArm.position.set(0, -0.45, 0);
    rig.rightLowerArm.position.set(0, -0.45, 0);
    rig.leftHand.position.set(0, -0.45, 0);
    rig.rightHand.position.set(0, -0.45, 0);

    const upperArmGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
    upperArmGeo.translate(0, -0.2, 0);
    const lowerArmGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
    lowerArmGeo.translate(0, -0.2, 0);
    const handGeo = new THREE.BoxGeometry(0.15, 0.2, 0.12);
    handGeo.translate(0, -0.1, 0);

    // Left arm is partially covered by cloth drape
    addMesh(rig.leftUpperArm, upperArmGeo, yokaiSkinMat);
    const armClothGeo = new THREE.BoxGeometry(0.14, 0.4, 0.14);
    armClothGeo.translate(0, -0.15, 0);
    addMesh(rig.leftUpperArm, armClothGeo, yokaiClothMat); // sleeve piece

    addMesh(rig.rightUpperArm, upperArmGeo, yokaiSkinMat);
    addMesh(rig.leftLowerArm, lowerArmGeo, yokaiSkinMat);
    addMesh(rig.rightLowerArm, lowerArmGeo, yokaiSkinMat);

    const lHand = addMesh(rig.leftHand, handGeo, yokaiSkinMat);
    const rHand = addMesh(rig.rightHand, handGeo, yokaiSkinMat);

    // Long spindly fingers with claws
    const fingerGeo = new THREE.BoxGeometry(0.02, 0.15, 0.02);
    fingerGeo.translate(0, -0.075, 0);
    const clawGeo = new THREE.ConeGeometry(0.015, 0.1, 3);
    clawGeo.translate(0, -0.05, 0.02); // curving inward
    
    const addFingers = (hand: THREE.Object3D, isLeft: boolean) => {
      for (let i = -1; i <= 1; i++) {
        const finger = new THREE.Mesh(fingerGeo, yokaiSkinMat);
        finger.position.set(i * 0.05, -0.2, 0.03);
        finger.rotation.x = -0.2;
        const claw = new THREE.Mesh(clawGeo, yokaiClawMat);
        claw.position.set(0, -0.15, 0);
        claw.rotation.x = -0.3;
        finger.add(claw);
        hand.add(finger);
      }
      // Thumb
      const thumb = new THREE.Mesh(fingerGeo, yokaiSkinMat);
      thumb.position.set(isLeft ? -0.08 : 0.08, -0.1, 0);
      thumb.rotation.z = isLeft ? -0.5 : 0.5;
      const tClaw = new THREE.Mesh(clawGeo, yokaiClawMat);
      tClaw.position.set(0, -0.15, 0);
      thumb.add(tClaw);
      hand.add(thumb);
    };
    addFingers(lHand, true);
    addFingers(rHand, false);

    // ─── Legs (Tattered pants, ropes, clawed feet) ──────────────────────
    rig.leftUpperLeg.position.set(0.15, 0, 0);
    rig.rightUpperLeg.position.set(-0.15, 0, 0);
    rig.leftLowerLeg.position.set(0, -0.5, 0);
    rig.rightLowerLeg.position.set(0, -0.5, 0);
    rig.leftFoot.position.set(0, -0.5, 0);
    rig.rightFoot.position.set(0, -0.5, 0);

    // Upper legs covered in jagged cloth
    const upperLegClothGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18);
    upperLegClothGeo.translate(0, -0.25, 0);
    const ulPos = upperLegClothGeo.attributes.position;
    for(let i=0; i<ulPos.count; i++) {
      if(ulPos.getY(i) < -0.1) {
        ulPos.setX(i, ulPos.getX(i) * (1 + Math.random()*0.2)); // jagged tearing
      }
    }
    upperLegClothGeo.computeVertexNormals();
    
    // Lower leg (part cloth, part skin)
    const lowerLegGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
    lowerLegGeo.translate(0, -0.25, 0);
    const lowerLegClothGeo = new THREE.BoxGeometry(0.14, 0.25, 0.14); // cloth only half way down
    lowerLegClothGeo.translate(0, -0.1, 0);

    addMesh(rig.leftUpperLeg, upperLegClothGeo, yokaiClothMat);
    addMesh(rig.rightUpperLeg, upperLegClothGeo, yokaiClothMat);
    
    addMesh(rig.leftLowerLeg, lowerLegGeo, yokaiSkinMat);
    addMesh(rig.rightLowerLeg, lowerLegGeo, yokaiSkinMat);
    addMesh(rig.leftLowerLeg, lowerLegClothGeo, yokaiClothMat);
    addMesh(rig.rightLowerLeg, lowerLegClothGeo, yokaiClothMat);

    // Ankle ropes
    const ankleRopeGeo = new THREE.TorusGeometry(0.08, 0.02, 6, 8);
    ankleRopeGeo.rotateX(Math.PI/2);
    for(let i=0; i<3; i++) {
      addMesh(rig.leftLowerLeg, ankleRopeGeo, yokaiRopeMat, -0.4 + (i*0.04));
      addMesh(rig.rightLowerLeg, ankleRopeGeo, yokaiRopeMat, -0.4 + (i*0.04));
    }

    // Clawed Bare Feet
    const footBaseGeo = new THREE.BoxGeometry(0.14, 0.1, 0.25);
    footBaseGeo.translate(0, -0.05, 0.05);
    const lFoot = addMesh(rig.leftFoot, footBaseGeo, yokaiSkinMat);
    const rFoot = addMesh(rig.rightFoot, footBaseGeo, yokaiSkinMat);

    const toeGeo = new THREE.BoxGeometry(0.03, 0.04, 0.1);
    toeGeo.translate(0, -0.02, 0.05);
    const toeClawGeo = new THREE.ConeGeometry(0.015, 0.08, 3);
    toeClawGeo.translate(0, -0.04, 0.08);
    toeClawGeo.rotateX(-Math.PI/2); // point forward
    
    const addToes = (foot: THREE.Object3D) => {
      for (let i = -1; i <= 1; i++) {
        const toe = new THREE.Mesh(toeGeo, yokaiSkinMat);
        toe.position.set(i * 0.04, -0.05, 0.15);
        const tClaw = new THREE.Mesh(toeClawGeo, yokaiClawMat);
        toe.add(tClaw);
        foot.add(toe);
      }
    };
    addToes(lFoot);
    addToes(rFoot);

    // Default pose tweaks for a hunched stance
    rig.spine.rotation.x = 0.1;
    rig.chest.rotation.x = 0.15;
    rig.head.rotation.x = -0.15;

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

  // ─── Tengu ────────────────────────────────────────────────────────────────
  
  public static createTengu(): CharacterRig {
    const rig = new CharacterRig();

    const addMesh = (parent: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, yOffset = 0) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = yOffset;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // ── Torso ──
    const pelvisGeo = new THREE.BoxGeometry(0.3, 0.2, 0.25);
    const spineGeo = new THREE.BoxGeometry(0.25, 0.3, 0.2);
    const chestGeo = new THREE.BoxGeometry(0.45, 0.4, 0.3);
    
    // ── Head & Beak ──
    const headGeo = new THREE.BoxGeometry(0.2, 0.25, 0.2);
    const beakGeo = new THREE.ConeGeometry(0.04, 0.25, 4);
    beakGeo.translate(0, 0.125, 0);
    beakGeo.rotateX(Math.PI / 2); // point forward
    
    const beak = new THREE.Mesh(beakGeo, tenguBeakMat);
    beak.position.set(0, 0.05, 0.1);
    
    const eyeGeo = new THREE.BoxGeometry(0.04, 0.02, 0.02);
    const lEye = new THREE.Mesh(eyeGeo, tenguEyeMat);
    lEye.position.set(0.06, 0.08, 0.1);
    lEye.rotation.z = 0.1;
    const rEye = new THREE.Mesh(eyeGeo, tenguEyeMat);
    rEye.position.set(-0.06, 0.08, 0.1);
    rEye.rotation.z = -0.1;

    // ── Limbs ──
    const upperArmGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12);
    upperArmGeo.translate(0, -0.225, 0);
    const lowerArmGeo = new THREE.BoxGeometry(0.1, 0.45, 0.1);
    lowerArmGeo.translate(0, -0.225, 0);
    const handGeo = new THREE.BoxGeometry(0.15, 0.2, 0.15);
    handGeo.translate(0, -0.1, 0);

    const upperLegGeo = new THREE.BoxGeometry(0.18, 0.4, 0.18);
    upperLegGeo.translate(0, -0.2, 0);
    const lowerLegGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
    lowerLegGeo.translate(0, -0.2, 0);
    
    // Claw-like feet (bird talons)
    const footGeo = new THREE.BoxGeometry(0.1, 0.05, 0.15);
    const talonGeo = new THREE.ConeGeometry(0.02, 0.1, 3);
    talonGeo.translate(0, 0.05, 0);
    talonGeo.rotateX(Math.PI / 2);
    
    const addTalons = (foot: THREE.Object3D) => {
      for (let i = -1; i <= 1; i++) {
        const talon = new THREE.Mesh(talonGeo, tenguBeakMat);
        talon.position.set(i * 0.04, -0.02, 0.07);
        foot.add(talon);
      }
    };

    // ── Procedural Wings ──
    rig.leftWing = new THREE.Group();
    rig.rightWing = new THREE.Group();
    rig.chest.add(rig.leftWing);
    rig.chest.add(rig.rightWing);
    
    rig.leftWing.position.set(0.15, 0.1, -0.1);
    rig.rightWing.position.set(-0.15, 0.1, -0.1);

    const createWingGeometry = (isLeft: boolean) => {
      const wingGroup = new THREE.Group();
      // Layered feathers
      const numFeathers = 6;
      for (let i = 0; i < numFeathers; i++) {
        const fw = 0.1 + (i * 0.05);
        const fh = 0.6 + (i * 0.2);
        const featherGeo = new THREE.PlaneGeometry(fw, fh);
        // Taper plane
        const pos = featherGeo.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          if (pos.getY(v) < 0) {
            pos.setX(v, pos.getX(v) * 0.2);
          }
        }
        featherGeo.computeVertexNormals();
        featherGeo.translate(0, -fh / 2, 0);

        const feather = new THREE.Mesh(featherGeo, tenguFeatherMat);
        feather.castShadow = true;
        // Spread them out like a fan
        const angle = (i / (numFeathers - 1)) * (Math.PI * 0.6); // 100 degrees spread
        feather.rotation.z = isLeft ? -angle : angle;
        feather.position.set(isLeft ? i * 0.1 : -i * 0.1, -i * 0.05, i * 0.02);
        wingGroup.add(feather);
      }
      return wingGroup;
    };

    rig.leftWing.add(createWingGeometry(true));
    rig.rightWing.add(createWingGeometry(false));

    // ── Assembly ──
    addMesh(rig.pelvis, pelvisGeo, tenguClothMat);
    addMesh(rig.spine, spineGeo, tenguClothMat);
    
    // Chest with red accent
    addMesh(rig.chest, chestGeo, tenguClothMat);
    const sashGeo = new THREE.BoxGeometry(0.48, 0.1, 0.32);
    addMesh(rig.chest, sashGeo, tenguAccentMat, -0.1);
    
    // Feathered Shoulders (collar)
    const collarGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.2, 8);
    const collar = addMesh(rig.chest, collarGeo, tenguFeatherMat, 0.15);
    collar.rotation.x = 0.2;

    const headMesh = addMesh(rig.head, headGeo, tenguSkinMat, 0.125);
    headMesh.add(beak, lEye, rEye);

    // Adjust rig proportions for flight
    rig.leftUpperArm.position.set(0.3, 0.15, 0);
    rig.rightUpperArm.position.set(-0.3, 0.15, 0);
    
    addMesh(rig.leftUpperArm, upperArmGeo, tenguClothMat);
    addMesh(rig.rightUpperArm, upperArmGeo, tenguClothMat);
    addMesh(rig.leftLowerArm, lowerArmGeo, tenguSkinMat);
    addMesh(rig.rightLowerArm, lowerArmGeo, tenguSkinMat);
    addMesh(rig.leftHand, handGeo, tenguSkinMat);
    addMesh(rig.rightHand, handGeo, tenguSkinMat);

    // Legs
    rig.leftUpperLeg.position.set(0.12, -0.1, 0);
    rig.rightUpperLeg.position.set(-0.12, -0.1, 0);

    addMesh(rig.leftUpperLeg, upperLegGeo, tenguClothMat);
    addMesh(rig.rightUpperLeg, upperLegGeo, tenguClothMat);
    addMesh(rig.leftLowerLeg, lowerLegGeo, tenguSkinMat);
    addMesh(rig.rightLowerLeg, lowerLegGeo, tenguSkinMat);
    const lFoot = addMesh(rig.leftFoot, footGeo, tenguSkinMat, -0.025);
    const rFoot = addMesh(rig.rightFoot, footGeo, tenguSkinMat, -0.025);
    addTalons(lFoot);
    addTalons(rFoot);

    // Rescale slightly taller
    rig.root.scale.set(1.1, 1.15, 1.1);
    rig.pelvis.position.set(0, 1.1, 0);

    return rig;
  }
}
