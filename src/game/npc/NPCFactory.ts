// ─── NPC Factory ────────────────────────────────────────────────────────────
// Procedural generation of NPC models using CharacterRig + Three.js primitives.

import * as THREE from 'three';
import { CharacterRig } from '../characters/CharacterRig';

// ─── Shrine Keeper Materials ────────────────────────────────────────────────
const robeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 1.0 }); // Dark cloth
const innerRobeMat = new THREE.MeshStandardMaterial({ color: 0x1a1520, roughness: 1.0 });
const skinMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.7 });
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488cc, emissiveIntensity: 2.0 });
const beadMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.5, metalness: 0.2 });
const staffMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8 });

export class NPCFactory {
  public static createShrineKeeper(): CharacterRig {
    const rig = new CharacterRig();

    const addMesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, yOffset = 0, xOffset = 0, zOffset = 0) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(xOffset, yOffset, zOffset);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    rig.root.scale.set(1.0, 1.0, 1.0);
    rig.pelvis.position.set(0, 1.0, 0);

    // ─── Robe Body ──────────────────────────────────────────────────────
    // Lower robe (wide, flowing)
    const lowerRobeGeo = new THREE.CylinderGeometry(0.15, 0.45, 1.2, 8);
    lowerRobeGeo.translate(0, -0.6, 0);
    addMesh(rig.pelvis, lowerRobeGeo, robeMat);

    // Upper Robe / Spine
    const spineGeo = new THREE.BoxGeometry(0.35, 0.3, 0.25);
    addMesh(rig.spine, spineGeo, robeMat, 0.15);

    // Chest
    const chestGeo = new THREE.BoxGeometry(0.4, 0.35, 0.28);
    addMesh(rig.chest, chestGeo, robeMat, 0.15);

    // Inner robe V-neck
    const lapelGeo = new THREE.BoxGeometry(0.08, 0.35, 0.03);
    const lLapel = addMesh(rig.chest, lapelGeo, innerRobeMat, 0.1, 0.06, 0.15);
    lLapel.rotation.z = -0.3;
    const rLapel = addMesh(rig.chest, lapelGeo, innerRobeMat, 0.1, -0.06, 0.15);
    rLapel.rotation.z = 0.3;

    // ─── Head ───────────────────────────────────────────────────────────
    // Hood (large, obscuring the face)
    const hoodGeo = new THREE.SphereGeometry(0.18, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.7);
    const hood = addMesh(rig.head, hoodGeo, robeMat, 0.12);
    hood.scale.set(1, 1.2, 1.1);

    // Face (mostly hidden under hood)
    const faceGeo = new THREE.BoxGeometry(0.14, 0.1, 0.12);
    addMesh(rig.head, faceGeo, skinMat, 0.05, 0, 0.05);

    // Glowing eyes (visible under hood)
    const eyeGeo = new THREE.BoxGeometry(0.025, 0.012, 0.01);
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(0.03, 0.07, 0.12);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(-0.03, 0.07, 0.12);
    rig.head.add(lEye, rEye);

    // ─── Arms (hidden in robe sleeves) ──────────────────────────────────
    rig.leftUpperArm.position.set(0.22, 0.2, 0);
    rig.rightUpperArm.position.set(-0.22, 0.2, 0);

    const sleeveGeo = new THREE.CylinderGeometry(0.06, 0.12, 0.5, 6);
    sleeveGeo.translate(0, -0.25, 0);
    addMesh(rig.leftUpperArm, sleeveGeo, robeMat);
    addMesh(rig.rightUpperArm, sleeveGeo, robeMat);

    // Hands (barely visible)
    const handGeo = new THREE.BoxGeometry(0.06, 0.08, 0.05);
    addMesh(rig.leftHand, handGeo, skinMat, -0.04);
    addMesh(rig.rightHand, handGeo, skinMat, -0.04);

    // ─── Prayer Beads ───────────────────────────────────────────────────
    const beadCount = 8;
    for (let i = 0; i < beadCount; i++) {
      const angle = (i / beadCount) * Math.PI * 2;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), beadMat);
      bead.position.set(Math.cos(angle) * 0.2, -0.05 + Math.sin(angle) * 0.1, 0.12);
      rig.chest.add(bead);
    }

    // ─── Staff (in left hand) ───────────────────────────────────────────
    const staffGroup = new THREE.Group();
    const staffPoleGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6);
    addMesh(staffGroup, staffPoleGeo, staffMat, 0.8);
    // Staff ornament at top
    const ornamentGeo = new THREE.SphereGeometry(0.06, 6, 6);
    addMesh(staffGroup, ornamentGeo, beadMat, 1.9);
    // Rings on staff
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(0.04, 0.008, 4, 8);
      const ring = addMesh(staffGroup, ringGeo, beadMat, 1.7 + i * 0.08);
      ring.rotation.x = Math.PI / 2;
    }

    staffGroup.position.set(0, -0.1, 0.05);
    rig.leftHand.add(staffGroup);

    // Calm, slightly hunched posture
    rig.spine.rotation.x = 0.1;
    rig.chest.rotation.x = 0.05;
    rig.head.rotation.x = -0.1;
    rig.leftUpperArm.rotation.x = 0.3; // Arms forward, holding staff

    return rig;
  }

  public static create(modelType: string): CharacterRig {
    switch (modelType) {
      case 'SHRINE_KEEPER': return NPCFactory.createShrineKeeper();
      default:
        console.warn(`Unknown NPC model type: ${modelType}. Using Shrine Keeper.`);
        return NPCFactory.createShrineKeeper();
    }
  }
}
