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
const shadowSkinMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.95 }); // Pitch black textured skin
const shadowClothMat = new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 1.0 }); // Very dark patterned robe
const shadowAccentMat = new THREE.MeshStandardMaterial({ color: 0x3a3020, roughness: 0.6, metalness: 0.4 }); // Dark bronze/gold accents
const shadowEyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3.0 });
const shadowClawMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1, metalness: 0.8 }); // Glossy black claws
const shadowSmokeMat = new THREE.MeshStandardMaterial({ color: 0x08080a, transparent: true, opacity: 0.8, depthWrite: false });

// ─── Tengu Materials ────────────────────────────────────────────────────────
const tenguSkinMat = new THREE.MeshStandardMaterial({ color: 0x992222, roughness: 0.6 }); // Deep crimson skin
const tenguHairMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8 }); // Black hair/feathers
const tenguClothMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 1.0 }); // Dark charcoal kimono
const tenguMetalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.4 }); // Dark armor
const tenguAccentMat = new THREE.MeshStandardMaterial({ color: 0x881111, roughness: 0.9, flatShading: true }); // Red ropes/tassels
const tenguGoldMat = new THREE.MeshStandardMaterial({ color: 0xbba855, metalness: 0.8, roughness: 0.3 }); // Gold trim
const tenguEyeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xdd8800, emissiveIntensity: 2.0 });
const tenguEyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 2.0 });

export class EnemyFactory {
  public static createBasicYokai(): CharacterRig {
    const rig = new CharacterRig();

    const addMesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, yOffset = 0, xOffset = 0, zOffset = 0) => {
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

    const addMesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, yOffset = 0, xOffset = 0, zOffset = 0) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(xOffset, yOffset, zOffset);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // ─── Proportions & Base ──────────────────────────────────────────────
    // Very tall and floating/spindly
    const scale = 1.3;
    rig.root.scale.set(scale, scale, scale);
    rig.pelvis.position.set(0, 1.4, 0);

    // ─── Torso & Robes ──────────────────────────────────────────────────
    // Slender hidden pelvis
    const pelvisGeo = new THREE.BoxGeometry(0.3, 0.2, 0.2);
    addMesh(rig.pelvis, pelvisGeo, shadowClothMat);
    
    // Spine
    const spineGeo = new THREE.BoxGeometry(0.25, 0.35, 0.2);
    addMesh(rig.spine, spineGeo, shadowClothMat, 0.175);

    // Slender chest
    const chestGeo = new THREE.BoxGeometry(0.4, 0.5, 0.25);
    const cPos = chestGeo.attributes.position;
    for(let i=0; i<cPos.count; i++) {
      if (cPos.getY(i) < 0) {
        cPos.setX(i, cPos.getX(i) * 0.6); // Narrow at the waist
      }
    }
    chestGeo.computeVertexNormals();
    addMesh(rig.chest, chestGeo, shadowClothMat, 0.25);

    // Kimono Lapels (V-neck)
    const lapelGeo = new THREE.BoxGeometry(0.1, 0.5, 0.05);
    const lLapel = addMesh(rig.chest, lapelGeo, shadowClothMat, 0.2, 0.08, 0.13);
    lLapel.rotation.z = -0.3; lLapel.rotation.x = -0.1;
    const rLapel = addMesh(rig.chest, lapelGeo, shadowClothMat, 0.2, -0.08, 0.13);
    rLapel.rotation.z = 0.3; rLapel.rotation.x = -0.1;

    // Rope Belt
    const beltGeo = new THREE.TorusGeometry(0.18, 0.03, 6, 16);
    beltGeo.rotateX(Math.PI / 2);
    addMesh(rig.pelvis, beltGeo, shadowSkinMat, 0.1);
    
    // Dangling Tassel
    const tasselCordGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.4);
    const tasselCord = addMesh(rig.pelvis, tasselCordGeo, shadowSkinMat, -0.1, 0.12, 0.18);
    const beadGeo = new THREE.SphereGeometry(0.04, 8, 8);
    addMesh(tasselCord, beadGeo, shadowAccentMat, -0.1);
    const tasselFringeGeo = new THREE.ConeGeometry(0.03, 0.15, 6);
    addMesh(tasselCord, tasselFringeGeo, shadowClothMat, -0.2);

    // ─── Head & Face ────────────────────────────────────────────────────
    const headGeo = new THREE.BoxGeometry(0.2, 0.3, 0.22);
    const headPos = headGeo.attributes.position;
    for(let i=0; i<headPos.count; i++) {
      if(headPos.getY(i) < 0) {
        headPos.setX(i, headPos.getX(i)*0.5); // Very sharp chin
        headPos.setZ(i, headPos.getZ(i)*0.6);
      } else {
        headPos.setX(i, headPos.getX(i)*0.8); // Narrow top
      }
    }
    headGeo.computeVertexNormals();
    const headMesh = addMesh(rig.head, headGeo, shadowSkinMat, 0.15);

    // Small piercing red eyes
    const eyeGeo = new THREE.BoxGeometry(0.03, 0.015, 0.01);
    const lEye = new THREE.Mesh(eyeGeo, shadowEyeMat);
    lEye.position.set(0.04, 0.04, 0.11); lEye.rotation.z = 0.2; lEye.rotation.x = -0.1;
    const rEye = new THREE.Mesh(eyeGeo, shadowEyeMat);
    rEye.position.set(-0.04, 0.04, 0.11); rEye.rotation.z = -0.2; rEye.rotation.x = -0.1;
    headMesh.add(lEye, rEye);

    // Smoky Tendrils from Head
    const wispGeo = new THREE.ConeGeometry(0.02, 0.4, 4);
    wispGeo.translate(0, 0.2, 0);
    const addWisps = (parent: THREE.Object3D, count: number, radius: number) => {
      for (let i = 0; i < count; i++) {
        const wisp = new THREE.Mesh(wispGeo, shadowSmokeMat);
        const angle = (i / count) * Math.PI * 2;
        wisp.position.set(Math.cos(angle)*radius, 0.1, Math.sin(angle)*radius - 0.05);
        
        // Randomly curl the wisps
        wisp.rotation.x = (Math.random() - 0.5) * 1.5;
        wisp.rotation.z = (Math.random() - 0.5) * 1.5;
        wisp.rotation.y = (Math.random() - 0.5) * 1.5;
        
        // Add a secondary curve
        const wisp2 = new THREE.Mesh(wispGeo, shadowSmokeMat);
        wisp2.position.set(0, 0.4, 0);
        wisp2.rotation.x = (Math.random() - 0.5) * 1.0;
        wisp2.rotation.z = (Math.random() - 0.5) * 1.0;
        wisp2.scale.set(0.7, 0.7, 0.7);
        wisp.add(wisp2);
        
        parent.add(wisp);
      }
    };
    addWisps(headMesh, 12, 0.08);
    // Add some wisps to upper chest/shoulders
    addWisps(rig.chest, 8, 0.15);

    // ─── Arms (Elongated, massive clawed hands) ─────────────────────────
    rig.leftUpperArm.position.set(0.25, 0.45, 0); 
    rig.rightUpperArm.position.set(-0.25, 0.45, 0);
    rig.leftLowerArm.position.set(0, -0.6, 0);
    rig.rightLowerArm.position.set(0, -0.6, 0);
    rig.leftHand.position.set(0, -0.6, 0);
    rig.rightHand.position.set(0, -0.6, 0);

    const upperArmGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.65, 6);
    upperArmGeo.translate(0, -0.325, 0);
    const lowerArmGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.65, 6);
    lowerArmGeo.translate(0, -0.325, 0);
    
    // Robe Sleeves (flowing down)
    const sleeveGeo = new THREE.BoxGeometry(0.18, 0.8, 0.18);
    sleeveGeo.translate(0, -0.4, 0);
    const sPos = sleeveGeo.attributes.position;
    for(let i=0; i<sPos.count; i++) {
      if(sPos.getY(i) < -0.2) {
        sPos.setX(i, sPos.getX(i) * (1 + Math.random()*0.5)); // Tattered/widening at bottom
        sPos.setZ(i, sPos.getZ(i) * (1 + Math.random()*0.5));
      }
    }
    sleeveGeo.computeVertexNormals();

    addMesh(rig.leftUpperArm, sleeveGeo, shadowClothMat);
    addMesh(rig.rightUpperArm, sleeveGeo, shadowClothMat);
    
    // Exposed black skinny arms underneath
    addMesh(rig.leftUpperArm, upperArmGeo, shadowSkinMat);
    addMesh(rig.rightUpperArm, upperArmGeo, shadowSkinMat);
    addMesh(rig.leftLowerArm, lowerArmGeo, shadowSkinMat);
    addMesh(rig.rightLowerArm, lowerArmGeo, shadowSkinMat);

    // Left shoulder armor (Sode)
    const sodeGeo = new THREE.BoxGeometry(0.15, 0.2, 0.15);
    addMesh(rig.leftUpperArm, sodeGeo, shadowAccentMat, 0.05, 0.1, 0).rotation.z = -0.2;

    // Huge spindly hands
    const handGeo = new THREE.BoxGeometry(0.12, 0.15, 0.08);
    handGeo.translate(0, -0.075, 0);
    const lHand = addMesh(rig.leftHand, handGeo, shadowSkinMat);
    const rHand = addMesh(rig.rightHand, handGeo, shadowSkinMat);

    // Extreme claws
    const fingerGeo = new THREE.BoxGeometry(0.015, 0.25, 0.015);
    fingerGeo.translate(0, -0.125, 0);
    const clawGeo = new THREE.ConeGeometry(0.01, 0.2, 3);
    clawGeo.translate(0, -0.1, 0.02); // curving inward
    
    const addFingers = (hand: THREE.Object3D, isLeft: boolean) => {
      for (let i = -1; i <= 1; i++) {
        const finger = new THREE.Mesh(fingerGeo, shadowSkinMat);
        finger.position.set(i * 0.04, -0.15, 0.02);
        finger.rotation.x = -0.2;
        const claw = new THREE.Mesh(clawGeo, shadowClawMat);
        claw.position.set(0, -0.25, 0);
        claw.rotation.x = -0.4;
        finger.add(claw);
        hand.add(finger);
      }
      // Thumb
      const thumb = new THREE.Mesh(fingerGeo, shadowSkinMat);
      thumb.position.set(isLeft ? -0.06 : 0.06, -0.05, 0);
      thumb.rotation.z = isLeft ? -0.6 : 0.6;
      const tClaw = new THREE.Mesh(clawGeo, shadowClawMat);
      tClaw.position.set(0, -0.25, 0);
      tClaw.rotation.x = -0.2;
      thumb.add(tClaw);
      hand.add(thumb);
    };
    addFingers(lHand, true);
    addFingers(rHand, false);

    // ─── Legs (Flowing tattered robes, skinny legs) ─────────────────────
    rig.leftUpperLeg.position.set(0.1, 0, 0);
    rig.rightUpperLeg.position.set(-0.1, 0, 0);
    rig.leftLowerLeg.position.set(0, -0.55, 0);
    rig.rightLowerLeg.position.set(0, -0.55, 0);

    // Central flowing skirt (attached to pelvis)
    const skirtGeo = new THREE.CylinderGeometry(0.2, 0.6, 1.2, 8, 4, true);
    skirtGeo.translate(0, -0.6, 0);
    const skPos = skirtGeo.attributes.position;
    for(let i=0; i<skPos.count; i++) {
      if(skPos.getY(i) < -0.4) {
        // Jagged bottom edge
        const noise = Math.random() * 0.3;
        skPos.setY(i, skPos.getY(i) + noise);
        // Wispy outward
        skPos.setX(i, skPos.getX(i) * (1 + noise));
        skPos.setZ(i, skPos.getZ(i) * (1 + noise));
      }
    }
    skirtGeo.computeVertexNormals();
    addMesh(rig.pelvis, skirtGeo, shadowClothMat);

    // Slender dark legs
    const upperLegGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.6, 6);
    upperLegGeo.translate(0, -0.3, 0);
    const lowerLegGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.6, 6);
    lowerLegGeo.translate(0, -0.3, 0);

    addMesh(rig.leftUpperLeg, upperLegGeo, shadowSkinMat);
    addMesh(rig.rightUpperLeg, upperLegGeo, shadowSkinMat);
    addMesh(rig.leftLowerLeg, lowerLegGeo, shadowSkinMat);
    addMesh(rig.rightLowerLeg, lowerLegGeo, shadowSkinMat);

    // Ankle wrapping
    const ankleWrapGeo = new THREE.TorusGeometry(0.035, 0.01, 4, 8);
    ankleWrapGeo.rotateX(Math.PI/2);
    for(let i=0; i<4; i++) {
      addMesh(rig.leftLowerLeg, ankleWrapGeo, shadowSkinMat, -0.45 + (i*0.03));
      addMesh(rig.rightLowerLeg, ankleWrapGeo, shadowSkinMat, -0.45 + (i*0.03));
    }

    // Bare Clawed Feet
    const footBaseGeo = new THREE.BoxGeometry(0.08, 0.08, 0.2);
    footBaseGeo.translate(0, -0.04, 0.05);
    const lFoot = addMesh(rig.leftFoot, footBaseGeo, shadowSkinMat);
    const rFoot = addMesh(rig.rightFoot, footBaseGeo, shadowSkinMat);

    const toeGeo = new THREE.BoxGeometry(0.02, 0.03, 0.08);
    toeGeo.translate(0, -0.015, 0.04);
    const toeClawGeo = new THREE.ConeGeometry(0.01, 0.08, 3);
    toeClawGeo.translate(0, -0.04, 0.08);
    toeClawGeo.rotateX(-Math.PI/2); 
    
    const addToes = (foot: THREE.Object3D) => {
      for (let i = -1; i <= 1; i++) {
        const toe = new THREE.Mesh(toeGeo, shadowSkinMat);
        toe.position.set(i * 0.025, -0.04, 0.12);
        const tClaw = new THREE.Mesh(toeClawGeo, shadowClawMat);
        toe.add(tClaw);
        foot.add(toe);
      }
    };
    addToes(lFoot);
    addToes(rFoot);

    // Floating/ominous posture
    rig.spine.rotation.x = -0.1; // Leaning back slightly
    rig.chest.rotation.x = 0.1; // Head forward
    rig.head.rotation.x = -0.1; // Looking down

    return rig;
  }

  // ─── Tengu ────────────────────────────────────────────────────────────────
  
  public static createTengu(): CharacterRig {
    const rig = new CharacterRig();

    const addMesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, yOffset = 0, xOffset = 0, zOffset = 0) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(xOffset, yOffset, zOffset);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // ─── Proportions & Base ──────────────────────────────────────────────
    // Muscular, upright, imposing
    const scale = 1.25;
    rig.root.scale.set(scale, scale, scale);
    rig.pelvis.position.set(0, 1.2, 0);

    // ─── Torso & Armor ──────────────────────────────────────────────────
    // Wide pelvis (Hakama pants base)
    const pelvisGeo = new THREE.BoxGeometry(0.4, 0.25, 0.3);
    addMesh(rig.pelvis, pelvisGeo, tenguClothMat);
    
    // Spine
    const spineGeo = new THREE.BoxGeometry(0.35, 0.3, 0.25);
    addMesh(rig.spine, spineGeo, tenguClothMat, 0.15);

    // Broad chest
    const chestGeo = new THREE.BoxGeometry(0.5, 0.4, 0.3);
    const cPos = chestGeo.attributes.position;
    for(let i=0; i<cPos.count; i++) {
      if (cPos.getY(i) < 0) {
        cPos.setX(i, cPos.getX(i) * 0.7); // Narrow at the waist
      }
    }
    chestGeo.computeVertexNormals();
    addMesh(rig.chest, chestGeo, tenguClothMat, 0.2);

    // Kimono Lapels (V-neck) with gold trim
    const lapelGeo = new THREE.BoxGeometry(0.15, 0.45, 0.04);
    const lLapel = addMesh(rig.chest, lapelGeo, tenguClothMat, 0.15, 0.1, 0.16);
    lLapel.rotation.z = -0.4; lLapel.rotation.x = -0.1;
    const rLapel = addMesh(rig.chest, lapelGeo, tenguClothMat, 0.15, -0.1, 0.16);
    rLapel.rotation.z = 0.4; rLapel.rotation.x = -0.1;
    
    // Bronze/Gold Emblems on chest lapels
    const emblemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12);
    emblemGeo.rotateX(Math.PI/2);
    addMesh(lLapel, emblemGeo, tenguGoldMat, 0.1, -0.02, 0.02);
    addMesh(rLapel, emblemGeo, tenguGoldMat, 0.1, 0.02, 0.02);

    // Heavy red rope belt around waist
    const beltGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 16);
    beltGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      addMesh(rig.pelvis, beltGeo, tenguAccentMat, 0.1 + (i*0.03));
    }
    // Giant rope knot
    const knotGeo = new THREE.SphereGeometry(0.06, 8, 8);
    addMesh(rig.pelvis, knotGeo, tenguAccentMat, 0.15, 0, 0.25);
    // Dangling Tassels
    const tasselCordGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.2);
    const lTassel = addMesh(rig.pelvis, tasselCordGeo, tenguAccentMat, -0.05, 0.05, 0.25);
    lTassel.rotation.z = -0.2; lTassel.rotation.x = 0.1;
    const rTassel = addMesh(rig.pelvis, tasselCordGeo, tenguAccentMat, -0.05, -0.05, 0.25);
    rTassel.rotation.z = 0.2; rTassel.rotation.x = 0.1;

    // Kusazuri (Armored Skirt Plates)
    const skirtPlateGeo = new THREE.BoxGeometry(0.15, 0.35, 0.03);
    skirtPlateGeo.translate(0, -0.15, 0);
    const createSkirtPlates = (parent: THREE.Object3D) => {
      for (let i = 0; i < 4; i++) {
        const plate = new THREE.Mesh(skirtPlateGeo, tenguMetalMat);
        const angle = (i / 4) * Math.PI * 2 + (Math.PI/4);
        plate.position.set(Math.cos(angle)*0.2, 0.05, Math.sin(angle)*0.15);
        plate.rotation.y = -angle + Math.PI/2;
        plate.rotation.x = 0.2; // angle outward slightly
        
        // Gold trim on plate
        const trimGeo = new THREE.BoxGeometry(0.16, 0.02, 0.04);
        const trim = new THREE.Mesh(trimGeo, tenguGoldMat);
        trim.position.set(0, -0.3, 0);
        plate.add(trim);
        parent.add(plate);
      }
    };
    createSkirtPlates(rig.pelvis);

    // ─── Head & Face ────────────────────────────────────────────────────
    const headGeo = new THREE.BoxGeometry(0.22, 0.28, 0.24);
    const headPos = headGeo.attributes.position;
    for(let i=0; i<headPos.count; i++) {
      if(headPos.getY(i) < 0) {
        headPos.setX(i, headPos.getX(i)*0.8);
        headPos.setZ(i, headPos.getZ(i)*0.8);
      }
    }
    headGeo.computeVertexNormals();
    const headMesh = addMesh(rig.head, headGeo, tenguSkinMat, 0.15);

    // Angry Glowing Eyes
    const eyeGeo = new THREE.BoxGeometry(0.04, 0.015, 0.01);
    const lEye = new THREE.Mesh(eyeGeo, tenguEyeMat);
    lEye.position.set(0.05, 0.05, 0.12); lEye.rotation.z = 0.15;
    const rEye = new THREE.Mesh(eyeGeo, tenguEyeMat);
    rEye.position.set(-0.05, 0.05, 0.12); rEye.rotation.z = -0.15;
    headMesh.add(lEye, rEye);
    // Brow ridge
    const browGeo = new THREE.BoxGeometry(0.18, 0.03, 0.04);
    addMesh(headMesh, browGeo, tenguSkinMat, 0.07, 0, 0.11).rotation.x = 0.2;

    // Classic Long Pointed Nose
    const noseGeo = new THREE.ConeGeometry(0.03, 0.25, 6);
    noseGeo.translate(0, -0.1, 0.12);
    noseGeo.rotateX(-Math.PI/2.5); // Pointing forward and slightly down
    addMesh(headMesh, noseGeo, tenguSkinMat, 0.02, 0, 0.05);

    // Pointy Elf Ears
    const earGeo = new THREE.ConeGeometry(0.03, 0.12, 4);
    const lEar = new THREE.Mesh(earGeo, tenguSkinMat);
    lEar.position.set(0.11, 0.02, 0); lEar.rotation.set(-0.2, 0, -1.2);
    const rEar = new THREE.Mesh(earGeo, tenguSkinMat);
    rEar.position.set(-0.11, 0.02, 0); rEar.rotation.set(-0.2, 0, 1.2);
    headMesh.add(lEar, rEar);

    // Black Beard & Topknot
    const beardGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
    addMesh(headMesh, beardGeo, tenguHairMat, -0.12, 0, 0.1).rotation.x = -0.2;
    const topknotGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6);
    addMesh(headMesh, topknotGeo, tenguHairMat, 0.18, 0, -0.05).rotation.x = -0.2;
    const ponytailGeo = new THREE.ConeGeometry(0.05, 0.25, 4);
    addMesh(headMesh, ponytailGeo, tenguHairMat, 0.15, 0, -0.15).rotation.x = -0.8;

    // ─── Wings (Massive Black Feathers) ─────────────────────────────────
    rig.leftWing = new THREE.Group();
    rig.rightWing = new THREE.Group();
    rig.chest.add(rig.leftWing);
    rig.chest.add(rig.rightWing);
    
    // Anchor wings higher on the back
    rig.leftWing.position.set(0.15, 0.2, -0.15);
    rig.rightWing.position.set(-0.15, 0.2, -0.15);

    const createWingGeometry = (isLeft: boolean) => {
      const wingGroup = new THREE.Group();
      const numFeathers = 10;
      for (let i = 0; i < numFeathers; i++) {
        const fw = 0.15 + (i * 0.02);
        const fh = 1.0 + (i * 0.1); // Massive length
        const featherGeo = new THREE.BoxGeometry(fw, fh, 0.02); // use thin box for solidity
        
        // Taper feather
        const pos = featherGeo.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          if (pos.getY(v) < 0) {
            pos.setX(v, pos.getX(v) * 0.1);
          }
        }
        featherGeo.computeVertexNormals();
        featherGeo.translate(0, -fh / 2, 0); // hinge at top

        const feather = new THREE.Mesh(featherGeo, tenguHairMat);
        feather.castShadow = true;
        
        // Spread fan shape (angled down and outward)
        const fanSpread = (i / (numFeathers - 1)) * (Math.PI * 0.7);
        feather.rotation.z = isLeft ? -fanSpread + 0.2 : fanSpread - 0.2;
        feather.rotation.x = 0.2 + (i*0.02); // sweep back
        feather.rotation.y = isLeft ? 0.2 : -0.2; // cup forward slightly
        
        feather.position.set(isLeft ? i * 0.05 : -i * 0.05, i * 0.02, i * 0.02);
        wingGroup.add(feather);
      }
      return wingGroup;
    };
    rig.leftWing.add(createWingGeometry(true));
    rig.rightWing.add(createWingGeometry(false));

    // ─── Arms (Armored) ─────────────────────────────────────────────────
    rig.leftUpperArm.position.set(0.32, 0.3, 0); 
    rig.rightUpperArm.position.set(-0.32, 0.3, 0);
    rig.leftLowerArm.position.set(0, -0.4, 0);
    rig.rightLowerArm.position.set(0, -0.4, 0);
    rig.leftHand.position.set(0, -0.4, 0);
    rig.rightHand.position.set(0, -0.4, 0);

    const upperArmGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.45, 8);
    upperArmGeo.translate(0, -0.2, 0);
    const lowerArmGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.45, 8);
    lowerArmGeo.translate(0, -0.2, 0);
    const handGeo = new THREE.BoxGeometry(0.12, 0.15, 0.1);
    handGeo.translate(0, -0.075, 0);

    addMesh(rig.leftUpperArm, upperArmGeo, tenguClothMat);
    addMesh(rig.rightUpperArm, upperArmGeo, tenguClothMat);
    
    // Kote (Armored Bracers on lower arm)
    addMesh(rig.leftLowerArm, lowerArmGeo, tenguMetalMat);
    addMesh(rig.rightLowerArm, lowerArmGeo, tenguMetalMat);
    
    // Gold trim on bracers
    const bracerTrim = new THREE.TorusGeometry(0.06, 0.01, 4, 8);
    bracerTrim.rotateX(Math.PI/2);
    addMesh(rig.leftLowerArm, bracerTrim, tenguGoldMat, -0.05);
    addMesh(rig.leftLowerArm, bracerTrim, tenguGoldMat, -0.35);
    addMesh(rig.rightLowerArm, bracerTrim, tenguGoldMat, -0.05);
    addMesh(rig.rightLowerArm, bracerTrim, tenguGoldMat, -0.35);

    // Sode (Pauldron Shoulder Armor)
    const sodeGeo = new THREE.BoxGeometry(0.18, 0.25, 0.18);
    sodeGeo.translate(0, -0.1, 0);
    const lSode = addMesh(rig.leftUpperArm, sodeGeo, tenguMetalMat, 0.05, 0.05, 0);
    lSode.rotation.z = -0.2;
    const rSode = addMesh(rig.rightUpperArm, sodeGeo, tenguMetalMat, 0.05, -0.05, 0);
    rSode.rotation.z = 0.2;
    // Pauldron trim
    const sodeTrim = new THREE.BoxGeometry(0.19, 0.02, 0.19);
    addMesh(lSode, sodeTrim, tenguGoldMat, -0.2);
    addMesh(rSode, sodeTrim, tenguGoldMat, -0.2);

    const lHand = addMesh(rig.leftHand, handGeo, tenguSkinMat);
    const rHand = addMesh(rig.rightHand, handGeo, tenguSkinMat);

    // Fingers with claws
    const fingerGeo = new THREE.BoxGeometry(0.02, 0.15, 0.02);
    fingerGeo.translate(0, -0.075, 0);
    const clawGeo = new THREE.ConeGeometry(0.015, 0.06, 3);
    clawGeo.translate(0, -0.03, 0.01);
    
    const addFingers = (hand: THREE.Object3D, isLeft: boolean) => {
      for (let i = -1; i <= 1; i++) {
        const finger = new THREE.Mesh(fingerGeo, tenguSkinMat);
        finger.position.set(i * 0.04, -0.15, 0.02);
        finger.rotation.x = -0.1;
        const claw = new THREE.Mesh(clawGeo, tenguHairMat);
        claw.position.set(0, -0.15, 0);
        claw.rotation.x = -0.3;
        finger.add(claw);
        hand.add(finger);
      }
      // Thumb
      const thumb = new THREE.Mesh(fingerGeo, tenguSkinMat);
      thumb.position.set(isLeft ? -0.06 : 0.06, -0.05, 0);
      thumb.rotation.z = isLeft ? -0.5 : 0.5;
      const tClaw = new THREE.Mesh(clawGeo, tenguHairMat);
      tClaw.position.set(0, -0.15, 0);
      thumb.add(tClaw);
      hand.add(thumb);
    };
    addFingers(lHand, true);
    addFingers(rHand, false);

    // Katana in Right Hand
    const katanaGroup = new THREE.Group();
    // Hilt
    const hiltGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8);
    addMesh(katanaGroup, hiltGeo, tenguAccentMat, 0.1); // Red wrapped hilt
    // Tsuba (Guard)
    const tsubaGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.01, 12);
    addMesh(katanaGroup, tsubaGeo, tenguGoldMat, 0.2);
    // Blade (Curved)
    const bladeGeo = new THREE.BoxGeometry(0.02, 0.8, 0.06);
    bladeGeo.translate(0, 0.4, 0);
    // Taper and curve
    const bPos = bladeGeo.attributes.position;
    for(let i=0; i<bPos.count; i++) {
      const y = bPos.getY(i);
      if(y > 0) {
        bPos.setZ(i, bPos.getZ(i) - (y * y * 0.15)); // curve back
        if(y > 0.6) bPos.setX(i, bPos.getX(i)*0.1); // point tip
      }
    }
    bladeGeo.computeVertexNormals();
    addMesh(katanaGroup, bladeGeo, new THREE.MeshStandardMaterial({color: 0xcccccc, metalness: 0.9, roughness: 0.1}), 0.2);
    
    katanaGroup.position.set(0, -0.1, 0.05);
    katanaGroup.rotation.x = Math.PI / 2; // Point forward
    rig.rightHand.add(katanaGroup);

    // ─── Legs (Baggy Pants, Armored Shins) ──────────────────────────────
    rig.leftUpperLeg.position.set(0.12, 0, 0);
    rig.rightUpperLeg.position.set(-0.12, 0, 0);
    rig.leftLowerLeg.position.set(0, -0.45, 0);
    rig.rightLowerLeg.position.set(0, -0.45, 0);
    rig.leftFoot.position.set(0, -0.45, 0);
    rig.rightFoot.position.set(0, -0.45, 0);

    // Baggy Hakama Pants (Upper leg)
    const upperLegGeo = new THREE.CylinderGeometry(0.18, 0.1, 0.5, 8);
    upperLegGeo.translate(0, -0.2, 0);
    
    // Armored Shin Guards (Lower leg)
    const lowerLegGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.5, 8);
    lowerLegGeo.translate(0, -0.2, 0);

    addMesh(rig.leftUpperLeg, upperLegGeo, tenguClothMat);
    addMesh(rig.rightUpperLeg, upperLegGeo, tenguClothMat);
    addMesh(rig.leftLowerLeg, lowerLegGeo, tenguMetalMat);
    addMesh(rig.rightLowerLeg, lowerLegGeo, tenguMetalMat);
    
    // Red shin ties
    const shinTieGeo = new THREE.TorusGeometry(0.08, 0.015, 6, 8);
    shinTieGeo.rotateX(Math.PI/2);
    addMesh(rig.leftLowerLeg, shinTieGeo, tenguAccentMat, -0.1);
    addMesh(rig.leftLowerLeg, shinTieGeo, tenguAccentMat, -0.35);
    addMesh(rig.rightLowerLeg, shinTieGeo, tenguAccentMat, -0.1);
    addMesh(rig.rightLowerLeg, shinTieGeo, tenguAccentMat, -0.35);

    // Bare Red Clawed Feet in Sandals (Geta/Waraji)
    const footBaseGeo = new THREE.BoxGeometry(0.12, 0.06, 0.22);
    footBaseGeo.translate(0, -0.03, 0.05);
    const lFoot = addMesh(rig.leftFoot, footBaseGeo, tenguSkinMat);
    const rFoot = addMesh(rig.rightFoot, footBaseGeo, tenguSkinMat);
    
    // Sandal sole
    const sandalGeo = new THREE.BoxGeometry(0.13, 0.02, 0.24);
    addMesh(lFoot, sandalGeo, tenguClothMat, -0.06, 0, 0.05);
    addMesh(rFoot, sandalGeo, tenguClothMat, -0.06, 0, 0.05);

    const toeGeo = new THREE.BoxGeometry(0.025, 0.03, 0.08);
    toeGeo.translate(0, -0.015, 0.04);
    const toeClawGeo = new THREE.ConeGeometry(0.015, 0.06, 3);
    toeClawGeo.translate(0, -0.03, 0.06);
    toeClawGeo.rotateX(-Math.PI/2.5); 
    
    const addToes = (foot: THREE.Object3D) => {
      for (let i = -1; i <= 1; i++) {
        const toe = new THREE.Mesh(toeGeo, tenguSkinMat);
        toe.position.set(i * 0.035, -0.03, 0.15);
        const tClaw = new THREE.Mesh(toeClawGeo, tenguHairMat);
        toe.add(tClaw);
        foot.add(toe);
      }
    };
    addToes(lFoot);
    addToes(rFoot);

    // Regal, upright posture
    rig.spine.rotation.x = -0.05; // Chest out slightly
    rig.head.rotation.x = -0.05; // Looking down arrogantly

    return rig;
  }
}
