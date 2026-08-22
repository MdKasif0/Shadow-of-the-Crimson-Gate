import * as THREE from 'three';
import { CharacterRig } from '../characters/CharacterRig';

// ─── Crimson Oni Materials ──────────────────────────────────────────────────

const oniSkinMat = new THREE.MeshStandardMaterial({
  color: 0x991111, roughness: 0.8, flatShading: true
});
const oniArmorMat = new THREE.MeshStandardMaterial({
  color: 0x1c1a1a, roughness: 0.6, metalness: 0.7
});
const oniArmorTrimMat = new THREE.MeshStandardMaterial({
  color: 0x2d231e, roughness: 0.7, metalness: 0.8
}); // Tarnished bronze/gold trim
const oniClothMat = new THREE.MeshStandardMaterial({
  color: 0x100808, roughness: 1.0
});
const oniRedClothMat = new THREE.MeshStandardMaterial({
  color: 0x550a0a, roughness: 0.9
}); // Torn red cloth
const oniRopeMat = new THREE.MeshStandardMaterial({
  color: 0x3d1c1c, roughness: 0.9
}); // Dark red coiled rope
const oniHornMat = new THREE.MeshStandardMaterial({
  color: 0x22221c, roughness: 0.4, metalness: 0.3
});
const oniEyeMat = new THREE.MeshStandardMaterial({
  color: 0xffaa00, emissive: 0xff4400, emissiveIntensity: 3.0
});
const oniHairMat = new THREE.MeshStandardMaterial({
  color: 0x0a0a0a, roughness: 0.95, flatShading: true
});
const oniTeethMat = new THREE.MeshStandardMaterial({
  color: 0xddddcc, roughness: 0.3
});
const oniWeaponMetalMat = new THREE.MeshStandardMaterial({
  color: 0x1f1f1f, roughness: 0.4, metalness: 0.6
});
const oniWeaponWrapMat = new THREE.MeshStandardMaterial({
  color: 0x181818, roughness: 0.9
});
const oniWeaponSpikeMat = new THREE.MeshStandardMaterial({
  color: 0x3d3a33, roughness: 0.4, metalness: 0.7
});
const oniCoreMat = new THREE.MeshStandardMaterial({
  color: 0xff1100, emissive: 0xff1100, emissiveIntensity: 1.5,
  transparent: true, opacity: 0.8
});

/**
 * BossFactory — Constructs fully procedural boss characters.
 */
export class BossFactory {

  public static setPhaseMaterials(phaseId: number): void {
    if (phaseId === 1) { // PHASE_2
      oniEyeMat.emissiveIntensity = 8.0;
      oniCoreMat.emissiveIntensity = 4.0;
      oniCoreMat.color.setHex(0xff0000);
      oniCoreMat.emissive.setHex(0xff0000);
    } else if (phaseId === 2) { // PHASE_3
      oniEyeMat.emissiveIntensity = 15.0;
      oniCoreMat.emissiveIntensity = 8.0;
      oniCoreMat.color.setHex(0xff3300);
      oniCoreMat.emissive.setHex(0xff3300);
      oniSkinMat.color.setHex(0xaa0000);
    } else { // PHASE_1
      oniEyeMat.emissiveIntensity = 3.0;
      oniCoreMat.emissiveIntensity = 1.5;
      oniCoreMat.color.setHex(0xff1100);
      oniCoreMat.emissive.setHex(0xff1100);
      oniSkinMat.color.setHex(0x991111);
    }
  }

  public static fadeDefeatedMaterials(dt: number): void {
    const lerpSpeed = dt * 1.5;
    oniEyeMat.emissiveIntensity = THREE.MathUtils.lerp(oniEyeMat.emissiveIntensity, 0, lerpSpeed);
    oniCoreMat.emissiveIntensity = THREE.MathUtils.lerp(oniCoreMat.emissiveIntensity, 0, lerpSpeed);
    
    // Fade skin back to neutral dark red
    const targetSkinColor = new THREE.Color(0x330808);
    oniSkinMat.color.lerp(targetSkinColor, lerpSpeed);
  }

  /**
   * Create the Crimson Oni procedural character.
   */
  public static createCrimsonOni(): CharacterRig {
    const rig = new CharacterRig();

    const S = 2.4; // Slightly larger scale for massive bulk

    // --- PROPORTIONS ---
    rig.pelvis.position.set(0, 1.0 * S, 0);
    rig.spine.position.set(0, 0.15 * S, 0);
    rig.chest.position.set(0, 0.25 * S, 0);
    rig.neck.position.set(0, 0.22 * S, 0);
    rig.head.position.set(0, 0.12 * S, 0);

    rig.leftUpperArm.position.set(0.4 * S, 0.18 * S, 0); // Wider shoulders
    rig.rightUpperArm.position.set(-0.4 * S, 0.18 * S, 0);
    rig.leftLowerArm.position.set(0.05 * S, -0.35 * S, 0);
    rig.rightLowerArm.position.set(-0.05 * S, -0.35 * S, 0);
    rig.leftHand.position.set(0, -0.3 * S, 0);
    rig.rightHand.position.set(0, -0.3 * S, 0);

    rig.leftUpperLeg.position.set(0.18 * S, -0.12 * S, 0);
    rig.rightUpperLeg.position.set(-0.18 * S, -0.12 * S, 0);
    rig.leftLowerLeg.position.set(0, -0.5 * S, 0);
    rig.rightLowerLeg.position.set(0, -0.5 * S, 0);
    rig.leftFoot.position.set(0, -0.45 * S, 0.06 * S);
    rig.rightFoot.position.set(0, -0.45 * S, 0.06 * S);

    rig.weaponSlot.position.set(0, -0.1, 0);
    rig.sheathSlot.position.set(0.3 * S, -0.1, 0.15);

    // ─── HELPER ─────────────────────────────────────────────────────
    const addMesh = (
      parent: THREE.Group,
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      pos?: THREE.Vector3,
      rot?: THREE.Euler
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(geo, mat);
      if (pos) mesh.position.copy(pos);
      if (rot) mesh.rotation.copy(rot);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // ─── PELVIS & WAIST ARMOR ────────────────────────────────────────────────
    const pelvisGeo = new THREE.BoxGeometry(0.55 * S, 0.25 * S, 0.4 * S);
    addMesh(rig.pelvis, pelvisGeo, oniSkinMat);

    // Thick rope waist bindings (Shimenawa style)
    const ropeGeo = new THREE.TorusGeometry(0.35 * S, 0.04 * S, 8, 16);
    addMesh(rig.pelvis, ropeGeo, oniRopeMat, new THREE.Vector3(0, -0.05 * S, 0), new THREE.Euler(Math.PI/2, 0, -0.1));
    addMesh(rig.pelvis, ropeGeo, oniRopeMat, new THREE.Vector3(0, 0.0 * S, 0), new THREE.Euler(Math.PI/2, 0, 0.1));
    addMesh(rig.pelvis, ropeGeo, oniRopeMat, new THREE.Vector3(0, 0.05 * S, 0), new THREE.Euler(Math.PI/2, 0, 0));

    // Demon face buckle (abstract)
    const buckleGrp = new THREE.Group();
    buckleGrp.position.set(0, -0.02 * S, 0.35 * S);
    addMesh(buckleGrp, new THREE.BoxGeometry(0.25 * S, 0.25 * S, 0.08 * S), oniArmorTrimMat);
    addMesh(buckleGrp, new THREE.CylinderGeometry(0.12 * S, 0.12 * S, 0.1 * S, 8), oniArmorTrimMat, undefined, new THREE.Euler(Math.PI/2, 0, 0));
    // Buckle horns
    addMesh(buckleGrp, new THREE.ConeGeometry(0.02 * S, 0.08 * S, 4), oniHornMat, new THREE.Vector3(-0.1 * S, 0.15 * S, 0.05 * S), new THREE.Euler(-0.4, 0, 0.4));
    addMesh(buckleGrp, new THREE.ConeGeometry(0.02 * S, 0.08 * S, 4), oniHornMat, new THREE.Vector3(0.1 * S, 0.15 * S, 0.05 * S), new THREE.Euler(-0.4, 0, -0.4));
    rig.pelvis.add(buckleGrp);

    // Armored Skirt (Kusazuri)
    const skirtGeo = new THREE.BoxGeometry(0.18 * S, 0.45 * S, 0.04 * S);
    // Tapered skirt plates
    const sPos = skirtGeo.attributes.position;
    for(let i=0; i<sPos.count; i++) {
      if(sPos.getY(i) < 0) {
        sPos.setX(i, sPos.getX(i) * 1.2);
        sPos.setZ(i, sPos.getZ(i) * 0.5);
      }
    }
    skirtGeo.computeVertexNormals();

    const skirtRotations = [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, Math.PI];
    for (const angle of skirtRotations) {
      const radius = 0.28 * S;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      const plate = addMesh(rig.pelvis, skirtGeo, oniArmorMat, new THREE.Vector3(x, -0.25 * S, z));
      plate.rotation.y = angle;
      plate.rotation.x = -0.15; // Flare outwards
      
      // Trim on plates
      addMesh(plate, new THREE.BoxGeometry(0.2 * S, 0.02 * S, 0.05 * S), oniArmorTrimMat, new THREE.Vector3(0, -0.2 * S, 0));
      
      // Torn red cloth hanging between plates
      const cloth = addMesh(rig.pelvis, new THREE.PlaneGeometry(0.2 * S, 0.6 * S), oniRedClothMat, new THREE.Vector3(x*0.9, -0.3 * S, z*0.9));
      cloth.rotation.y = angle + 0.2;
      cloth.rotation.x = -0.1;
      (cloth.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    }

    // ─── SPINE & CHEST ──────────────────────────────────────────────────────
    const spineGeo = new THREE.BoxGeometry(0.55 * S, 0.3 * S, 0.38 * S);
    addMesh(rig.spine, spineGeo, oniSkinMat);

    // Muscular wide chest
    const chestGeo = new THREE.BoxGeometry(0.75 * S, 0.45 * S, 0.45 * S);
    const cPos = chestGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      if (cPos.getY(i) < 0) {
        cPos.setX(i, cPos.getX(i) * 0.7); // Taper to waist
      } else {
        cPos.setZ(i, cPos.getZ(i) * 1.1); // Barrel chest
      }
    }
    chestGeo.computeVertexNormals();
    addMesh(rig.chest, chestGeo, oniSkinMat);

    // Pectoral muscle bulges
    addMesh(rig.chest, new THREE.BoxGeometry(0.35 * S, 0.25 * S, 0.1 * S), oniSkinMat, new THREE.Vector3(-0.18 * S, 0.05 * S, 0.24 * S), new THREE.Euler(0, -0.1, 0));
    addMesh(rig.chest, new THREE.BoxGeometry(0.35 * S, 0.25 * S, 0.1 * S), oniSkinMat, new THREE.Vector3(0.18 * S, 0.05 * S, 0.24 * S), new THREE.Euler(0, 0.1, 0));

    // Chest Straps
    const strapGeo = new THREE.BoxGeometry(0.06 * S, 0.8 * S, 0.5 * S);
    addMesh(rig.chest, strapGeo, oniClothMat, new THREE.Vector3(0, 0, 0), new THREE.Euler(0.4, 0, 0.6));
    addMesh(rig.chest, strapGeo, oniClothMat, new THREE.Vector3(0, 0, 0), new THREE.Euler(0.4, 0, -0.6));

    // Chest Emblem (Central ring)
    addMesh(rig.chest, new THREE.TorusGeometry(0.08 * S, 0.02 * S, 8, 16), oniArmorTrimMat, new THREE.Vector3(0, -0.05 * S, 0.25 * S), new THREE.Euler(0, 0, 0));

    // Glowing core inside chest
    addMesh(rig.chest, new THREE.SphereGeometry(0.06 * S, 12, 12), oniCoreMat, new THREE.Vector3(0, -0.05 * S, 0.2 * S));

    // ─── NECK & HEAD ───────────────────────────────────────────────────────
    addMesh(rig.neck, new THREE.CylinderGeometry(0.14 * S, 0.18 * S, 0.18 * S, 8), oniSkinMat, new THREE.Vector3(0, 0.09 * S, 0));

    this.buildHead(rig, addMesh, S);
    this.buildArms(rig, addMesh, S);
    this.buildLegs(rig, addMesh, S);
    this.buildKanabo(rig, addMesh, S);

    return rig;
  }

  // ─── HEAD BUILDER ─────────────────────────────────────────────────────────

  private static buildHead(
    rig: CharacterRig,
    addMesh: (p: THREE.Group, g: THREE.BufferGeometry, m: THREE.Material, pos?: THREE.Vector3, rot?: THREE.Euler) => THREE.Mesh,
    S: number
  ): void {
    // Angular, broad head
    const headGeo = new THREE.BoxGeometry(0.3 * S, 0.3 * S, 0.3 * S);
    addMesh(rig.head, headGeo, oniSkinMat, new THREE.Vector3(0, 0.14 * S, 0));

    // Heavy brow ridge
    addMesh(rig.head, new THREE.BoxGeometry(0.35 * S, 0.08 * S, 0.15 * S), oniSkinMat, new THREE.Vector3(0, 0.22 * S, 0.1 * S));

    // Protruding Jaw / Snout
    addMesh(rig.head, new THREE.BoxGeometry(0.28 * S, 0.15 * S, 0.22 * S), oniSkinMat, new THREE.Vector3(0, -0.02 * S, 0.06 * S));

    // Tusks & Teeth
    const tuskGeo = new THREE.ConeGeometry(0.03 * S, 0.1 * S, 4);
    addMesh(rig.head, tuskGeo, oniTeethMat, new THREE.Vector3(-0.1 * S, -0.05 * S, 0.18 * S), new THREE.Euler(-2.8, 0.3, -0.2));
    addMesh(rig.head, tuskGeo, oniTeethMat, new THREE.Vector3(0.1 * S, -0.05 * S, 0.18 * S), new THREE.Euler(-2.8, -0.3, 0.2));
    
    // Smaller teeth
    const toothGeo = new THREE.ConeGeometry(0.015 * S, 0.05 * S, 4);
    for(let i=-1; i<=1; i++) {
      addMesh(rig.head, toothGeo, oniTeethMat, new THREE.Vector3(i * 0.04 * S, -0.06 * S, 0.18 * S), new THREE.Euler(Math.PI, 0, 0));
    }

    // Glowing Eyes
    addMesh(rig.head, new THREE.SphereGeometry(0.03 * S, 8, 8), oniEyeMat, new THREE.Vector3(-0.08 * S, 0.15 * S, 0.15 * S));
    addMesh(rig.head, new THREE.SphereGeometry(0.03 * S, 8, 8), oniEyeMat, new THREE.Vector3(0.08 * S, 0.15 * S, 0.15 * S));

    // Horns (Massive, curved backward)
    const buildHorn = (side: 1|-1) => {
      const hornGrp = new THREE.Group();
      hornGrp.position.set(side * 0.12 * S, 0.28 * S, 0.05 * S);
      
      const numSegments = 5;
      let currentParent = hornGrp;
      for(let i=0; i<numSegments; i++) {
        const radius = 0.06 * S * (1 - (i/numSegments));
        const len = 0.15 * S;
        const seg = addMesh(currentParent, new THREE.CylinderGeometry(radius*0.7, radius, len, 8), oniHornMat, new THREE.Vector3(0, len/2, 0));
        
        // Curve backward and outward
        seg.rotation.x = -0.25;
        seg.rotation.z = side * 0.15;
        
        // Prepare next segment
        const nextPivot = new THREE.Group();
        nextPivot.position.y = len/2;
        seg.add(nextPivot);
        currentParent = nextPivot;
      }
      rig.head.add(hornGrp);
    };
    buildHorn(1);
    buildHorn(-1);

    // Mane of black hair
    const maneGeo = new THREE.BoxGeometry(0.4 * S, 0.4 * S, 0.25 * S);
    addMesh(rig.head, maneGeo, oniHairMat, new THREE.Vector3(0, 0.15 * S, -0.15 * S));
    
    // Hanging strands of hair
    for (let i = 0; i < 8; i++) {
      const strand = addMesh(rig.head, new THREE.ConeGeometry(0.08 * S, 0.5 * S, 4), oniHairMat, 
        new THREE.Vector3((Math.random()-0.5) * 0.4 * S, 0, -0.2 * S - Math.random()*0.1),
        new THREE.Euler(-0.2 - Math.random()*0.2, 0, (Math.random()-0.5)*0.5)
      );
    }
  }

  // ─── ARMS BUILDER ─────────────────────────────────────────────────────────

  private static buildArms(
    rig: CharacterRig,
    addMesh: (p: THREE.Group, g: THREE.BufferGeometry, m: THREE.Material, pos?: THREE.Vector3, rot?: THREE.Euler) => THREE.Mesh,
    S: number
  ): void {
    // Upper arms — massive musculature
    const upperArmGeo = new THREE.BoxGeometry(0.24 * S, 0.45 * S, 0.24 * S);
    upperArmGeo.translate(0, -0.2 * S, 0);
    addMesh(rig.leftUpperArm, upperArmGeo, oniSkinMat);
    addMesh(rig.rightUpperArm, upperArmGeo, oniSkinMat);

    // Asymmetrical Left Pauldron (Massive spiked Sode)
    const pauldronGrp = new THREE.Group();
    pauldronGrp.position.set(0.12 * S, -0.05 * S, 0);
    pauldronGrp.rotation.z = -0.2;
    
    // Base dome/box
    addMesh(pauldronGrp, new THREE.BoxGeometry(0.35 * S, 0.25 * S, 0.35 * S), oniArmorMat);
    // Overlapping plates
    for(let i=1; i<=3; i++) {
      const plate = addMesh(pauldronGrp, new THREE.BoxGeometry(0.38 * S, 0.08 * S, 0.38 * S), oniArmorMat, new THREE.Vector3(0.02 * i, -0.08 * S * i, 0));
      plate.rotation.z = 0.15 * i;
      addMesh(plate, new THREE.BoxGeometry(0.4 * S, 0.02 * S, 0.4 * S), oniArmorTrimMat, new THREE.Vector3(0, -0.04 * S, 0));
      
      // Add spikes to plates
      addMesh(plate, new THREE.ConeGeometry(0.03 * S, 0.1 * S, 4), oniHornMat, new THREE.Vector3(0.18 * S, 0, 0.15 * S), new THREE.Euler(0.5, 0, -1));
      addMesh(plate, new THREE.ConeGeometry(0.03 * S, 0.1 * S, 4), oniHornMat, new THREE.Vector3(0.18 * S, 0, -0.15 * S), new THREE.Euler(-0.5, 0, -1));
    }
    
    // Giant spikes on top pauldron
    for(let i=-1; i<=1; i++) {
      addMesh(pauldronGrp, new THREE.ConeGeometry(0.05 * S, 0.18 * S, 4), oniHornMat, new THREE.Vector3(0, 0.15 * S, i * 0.1 * S), new THREE.Euler(i*0.3, 0, -0.5));
    }
    
    // Abstract skull face on pauldron
    addMesh(pauldronGrp, new THREE.BoxGeometry(0.2 * S, 0.15 * S, 0.1 * S), oniArmorTrimMat, new THREE.Vector3(0.15 * S, 0.05 * S, 0));
    addMesh(pauldronGrp, new THREE.SphereGeometry(0.03 * S, 8, 8), oniEyeMat, new THREE.Vector3(0.26 * S, 0.08 * S, 0.05 * S));
    addMesh(pauldronGrp, new THREE.SphereGeometry(0.03 * S, 8, 8), oniEyeMat, new THREE.Vector3(0.26 * S, 0.08 * S, -0.05 * S));

    rig.leftUpperArm.add(pauldronGrp);

    // Right Shoulder - Straps only (bare)
    addMesh(rig.rightUpperArm, new THREE.BoxGeometry(0.25 * S, 0.05 * S, 0.25 * S), oniClothMat, new THREE.Vector3(0, 0, 0));

    // Lower arms — thick forearms
    const lowerArmGeo = new THREE.BoxGeometry(0.22 * S, 0.35 * S, 0.22 * S);
    lowerArmGeo.translate(0, -0.175 * S, 0);
    addMesh(rig.leftLowerArm, lowerArmGeo, oniSkinMat);
    addMesh(rig.rightLowerArm, lowerArmGeo, oniSkinMat);

    // Thick Spiked Bracers (Kote)
    const bracerGeo = new THREE.BoxGeometry(0.26 * S, 0.25 * S, 0.26 * S);
    bracerGeo.translate(0, -0.15 * S, 0);
    const lBracer = addMesh(rig.leftLowerArm, bracerGeo, oniArmorMat);
    const rBracer = addMesh(rig.rightLowerArm, bracerGeo, oniArmorMat);
    
    // Red rope bindings on bracers
    for(let i=0; i<3; i++) {
      addMesh(lBracer, new THREE.BoxGeometry(0.28 * S, 0.02 * S, 0.28 * S), oniRopeMat, new THREE.Vector3(0, -0.05 * S - i * 0.08 * S, 0));
      addMesh(rBracer, new THREE.BoxGeometry(0.28 * S, 0.02 * S, 0.28 * S), oniRopeMat, new THREE.Vector3(0, -0.05 * S - i * 0.08 * S, 0));
    }
    // Spikes on bracers
    addMesh(lBracer, new THREE.ConeGeometry(0.03 * S, 0.1 * S, 4), oniHornMat, new THREE.Vector3(0.14 * S, -0.15 * S, 0), new THREE.Euler(0, 0, -Math.PI/2));
    addMesh(rBracer, new THREE.ConeGeometry(0.03 * S, 0.1 * S, 4), oniHornMat, new THREE.Vector3(-0.14 * S, -0.15 * S, 0), new THREE.Euler(0, 0, Math.PI/2));

    // Hands — enormous clawed hands
    const handGeo = new THREE.BoxGeometry(0.18 * S, 0.2 * S, 0.18 * S);
    handGeo.translate(0, -0.1 * S, 0);
    addMesh(rig.leftHand, handGeo, oniSkinMat);
    addMesh(rig.rightHand, handGeo, oniSkinMat);

    // Claws
    const clawGeo = new THREE.ConeGeometry(0.015 * S, 0.08 * S, 4);
    for (let finger = -1; finger <= 1; finger++) {
      addMesh(rig.leftHand, clawGeo, oniTeethMat, new THREE.Vector3(finger * 0.05 * S, -0.22 * S, 0.05 * S), new THREE.Euler(0.4, 0, 0));
      addMesh(rig.rightHand, clawGeo, oniTeethMat, new THREE.Vector3(finger * 0.05 * S, -0.22 * S, 0.05 * S), new THREE.Euler(0.4, 0, 0));
    }
  }

  // ─── LEGS BUILDER ─────────────────────────────────────────────────────────

  private static buildLegs(
    rig: CharacterRig,
    addMesh: (p: THREE.Group, g: THREE.BufferGeometry, m: THREE.Material, pos?: THREE.Vector3, rot?: THREE.Euler) => THREE.Mesh,
    S: number
  ): void {
    // Upper legs — massive tree trunks
    const upperLegGeo = new THREE.BoxGeometry(0.28 * S, 0.55 * S, 0.28 * S);
    upperLegGeo.translate(0, -0.275 * S, 0);
    addMesh(rig.leftUpperLeg, upperLegGeo, oniSkinMat);
    addMesh(rig.rightUpperLeg, upperLegGeo, oniSkinMat);

    // Knee guards
    addMesh(rig.leftUpperLeg, new THREE.BoxGeometry(0.25 * S, 0.2 * S, 0.15 * S), oniArmorMat, new THREE.Vector3(0, -0.45 * S, 0.15 * S));
    addMesh(rig.rightUpperLeg, new THREE.BoxGeometry(0.25 * S, 0.2 * S, 0.15 * S), oniArmorMat, new THREE.Vector3(0, -0.45 * S, 0.15 * S));

    // Lower legs
    const lowerLegGeo = new THREE.BoxGeometry(0.24 * S, 0.5 * S, 0.24 * S);
    lowerLegGeo.translate(0, -0.25 * S, 0);
    addMesh(rig.leftLowerLeg, lowerLegGeo, oniSkinMat);
    addMesh(rig.rightLowerLeg, lowerLegGeo, oniSkinMat);
    
    // Spiked Greaves (Suneate)
    const greaveGeo = new THREE.BoxGeometry(0.28 * S, 0.4 * S, 0.28 * S);
    const lGreave = addMesh(rig.leftLowerLeg, greaveGeo, oniArmorMat, new THREE.Vector3(0, -0.2 * S, 0));
    const rGreave = addMesh(rig.rightLowerLeg, greaveGeo, oniArmorMat, new THREE.Vector3(0, -0.2 * S, 0));
    
    // Red rope bindings on shins
    for(let i=0; i<4; i++) {
      addMesh(lGreave, new THREE.BoxGeometry(0.3 * S, 0.02 * S, 0.3 * S), oniRopeMat, new THREE.Vector3(0, 0.1 * S - i * 0.1 * S, 0));
      addMesh(rGreave, new THREE.BoxGeometry(0.3 * S, 0.02 * S, 0.3 * S), oniRopeMat, new THREE.Vector3(0, 0.1 * S - i * 0.1 * S, 0));
    }

    // Feet — bare, massive, clawed
    const footGeo = new THREE.BoxGeometry(0.24 * S, 0.12 * S, 0.35 * S);
    footGeo.translate(0, -0.06 * S, 0.08 * S);
    addMesh(rig.leftFoot, footGeo, oniSkinMat);
    addMesh(rig.rightFoot, footGeo, oniSkinMat);
    
    // Toe claws
    for(let i=-1; i<=1; i++) {
      addMesh(rig.leftFoot, new THREE.ConeGeometry(0.02 * S, 0.08 * S, 4), oniTeethMat, new THREE.Vector3(i * 0.08 * S, -0.05 * S, 0.28 * S), new THREE.Euler(Math.PI/2, 0, 0));
      addMesh(rig.rightFoot, new THREE.ConeGeometry(0.02 * S, 0.08 * S, 4), oniTeethMat, new THREE.Vector3(i * 0.08 * S, -0.05 * S, 0.28 * S), new THREE.Euler(Math.PI/2, 0, 0));
    }
  }

  // ─── KANABO BUILDER ───────────────────────────────────────────────────────

  private static buildKanabo(
    rig: CharacterRig,
    addMesh: (p: THREE.Group, g: THREE.BufferGeometry, m: THREE.Material, pos?: THREE.Vector3, rot?: THREE.Euler) => THREE.Mesh,
    S: number
  ): void {
    const weaponGroup = new THREE.Group();
    weaponGroup.name = 'Kanabo';

    // Handle — wrapped cylinder
    const handleGeo = new THREE.CylinderGeometry(0.035 * S, 0.04 * S, 0.8 * S, 8);
    addMesh(weaponGroup, handleGeo, oniWeaponWrapMat, new THREE.Vector3(0, -0.4 * S, 0));

    // Handle wrapping rings
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.TorusGeometry(0.045 * S, 0.01 * S, 6, 12);
      addMesh(weaponGroup, ringGeo, oniArmorTrimMat,
        new THREE.Vector3(0, -0.15 * S - i * 0.15 * S, 0),
        new THREE.Euler(Math.PI / 2, 0, 0)
      );
    }

    // Shaft body — octagonal, heavy taper (narrow at grip, huge at end)
    const shaftGeo = new THREE.CylinderGeometry(0.15 * S, 0.08 * S, 1.8 * S, 8);
    addMesh(weaponGroup, shaftGeo, oniWeaponMetalMat, new THREE.Vector3(0, 0.9 * S, 0));

    // Giant metal spikes along the shaft
    const spikeGeo = new THREE.ConeGeometry(0.04 * S, 0.15 * S, 4);
    const spikeRows = 7;
    const spikesPerRow = 6;

    for (let row = 0; row < spikeRows; row++) {
      const y = 0.2 * S + row * 0.22 * S;
      // Interpolate radius of cylinder at this height
      const t = row / (spikeRows - 1);
      const currentRadius = 0.08 * S + (0.15 * S - 0.08 * S) * t;

      for (let spike = 0; spike < spikesPerRow; spike++) {
        const angle = (spike / spikesPerRow) * Math.PI * 2 + (row % 2) * (Math.PI / spikesPerRow);
        
        const spikeMesh = new THREE.Mesh(spikeGeo, oniWeaponSpikeMat);
        spikeMesh.position.set(
          Math.cos(angle) * currentRadius,
          y,
          Math.sin(angle) * currentRadius
        );
        // Point outward
        spikeMesh.rotation.z = -Math.cos(angle) * Math.PI / 2;
        spikeMesh.rotation.x = Math.sin(angle) * Math.PI / 2;
        spikeMesh.castShadow = true;
        weaponGroup.add(spikeMesh);
      }
    }

    // Pommel — cap at bottom
    const pommelGeo = new THREE.SphereGeometry(0.05 * S, 8, 8);
    addMesh(weaponGroup, pommelGeo, oniWeaponMetalMat, new THREE.Vector3(0, -0.82 * S, 0));

    // Top cap
    const topCapGeo = new THREE.SphereGeometry(0.15 * S, 8, 8);
    addMesh(weaponGroup, topCapGeo, oniWeaponMetalMat, new THREE.Vector3(0, 1.82 * S, 0));
    
    // Top spike
    addMesh(weaponGroup, new THREE.ConeGeometry(0.06 * S, 0.2 * S, 4), oniWeaponSpikeMat, new THREE.Vector3(0, 2.0 * S, 0));

    // Attach to weapon slot
    weaponGroup.rotation.x = -0.1; // Slight tilt when held
    rig.weaponSlot.add(weaponGroup);
  }
}
