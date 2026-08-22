import * as THREE from 'three';
import { CharacterRig } from '../characters/CharacterRig';

// ─── Crimson Oni Materials ──────────────────────────────────────────────────

const oniSkinMat = new THREE.MeshStandardMaterial({
  color: 0x881111, roughness: 0.8, flatShading: true
});
const oniArmorMat = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a, roughness: 0.5, metalness: 0.4
});
const oniArmorTrimMat = new THREE.MeshStandardMaterial({
  color: 0x661111, roughness: 0.6, metalness: 0.3
});
const oniClothMat = new THREE.MeshStandardMaterial({
  color: 0x151520, roughness: 1.0
});
const oniHornMat = new THREE.MeshStandardMaterial({
  color: 0x444433, roughness: 0.3, metalness: 0.1
});
const oniEyeMat = new THREE.MeshStandardMaterial({
  color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 3.0
});
const oniHairMat = new THREE.MeshStandardMaterial({
  color: 0x111111, roughness: 0.95, flatShading: true
});
const oniTeethMat = new THREE.MeshStandardMaterial({
  color: 0xccccaa, roughness: 0.3
});
const oniWeaponMetalMat = new THREE.MeshStandardMaterial({
  color: 0x222222, roughness: 0.4, metalness: 0.6
});
const oniWeaponWrapMat = new THREE.MeshStandardMaterial({
  color: 0x111111, roughness: 1.0
});
const oniWeaponSpikeMat = new THREE.MeshStandardMaterial({
  color: 0x333333, roughness: 0.3, metalness: 0.5
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
      oniSkinMat.color.setHex(0x660000);
    } else { // PHASE_1
      oniEyeMat.emissiveIntensity = 3.0;
      oniCoreMat.emissiveIntensity = 1.5;
      oniCoreMat.color.setHex(0xff1100);
      oniCoreMat.emissive.setHex(0xff1100);
      oniSkinMat.color.setHex(0x881111);
    }
  }

  public static fadeDefeatedMaterials(dt: number): void {
    const lerpSpeed = dt * 1.5;
    oniEyeMat.emissiveIntensity = THREE.MathUtils.lerp(oniEyeMat.emissiveIntensity, 0, lerpSpeed);
    oniCoreMat.emissiveIntensity = THREE.MathUtils.lerp(oniCoreMat.emissiveIntensity, 0, lerpSpeed);
    
    // Fade skin back to neutral dark red if it was glowing/bright
    const targetSkinColor = new THREE.Color(0x330808);
    oniSkinMat.color.lerp(targetSkinColor, lerpSpeed);
  }

  /**
   * Create the Crimson Oni procedural character.
   * Returns a CharacterRig with all geometry attached, scaled to ~3.5–4.0 units.
   */
  public static createCrimsonOni(): CharacterRig {
    const rig = new CharacterRig();

    // ─── SCALE UP PROPORTIONS ───────────────────────────────────────
    // The rig defaults are for Ronin (~1.8m). Scale everything for Oni (~3.8m).
    const S = 2.1; // scale factor

    rig.pelvis.position.set(0, 1.0 * S, 0);
    rig.spine.position.set(0, 0.15 * S, 0);
    rig.chest.position.set(0, 0.25 * S, 0);
    rig.neck.position.set(0, 0.22 * S, 0);
    rig.head.position.set(0, 0.12 * S, 0);

    rig.leftUpperArm.position.set(0.35 * S, 0.18 * S, 0);
    rig.rightUpperArm.position.set(-0.35 * S, 0.18 * S, 0);
    rig.leftLowerArm.position.set(0.05 * S, -0.35 * S, 0);
    rig.rightLowerArm.position.set(-0.05 * S, -0.35 * S, 0);
    rig.leftHand.position.set(0, -0.3 * S, 0);
    rig.rightHand.position.set(0, -0.3 * S, 0);

    rig.leftUpperLeg.position.set(0.16 * S, -0.12 * S, 0);
    rig.rightUpperLeg.position.set(-0.16 * S, -0.12 * S, 0);
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

    // ─── PELVIS ─────────────────────────────────────────────────────
    const pelvisGeo = new THREE.BoxGeometry(0.5 * S, 0.22 * S, 0.35 * S);
    addMesh(rig.pelvis, pelvisGeo, oniClothMat);

    // Waist armor plates (kusazuri)
    for (let i = -1; i <= 1; i += 2) {
      const plateGeo = new THREE.BoxGeometry(0.2 * S, 0.25 * S, 0.04 * S);
      addMesh(rig.pelvis, plateGeo, oniArmorMat,
        new THREE.Vector3(i * 0.15 * S, -0.12 * S, 0.16 * S)
      );
      addMesh(rig.pelvis, plateGeo, oniArmorMat,
        new THREE.Vector3(i * 0.15 * S, -0.12 * S, -0.16 * S)
      );
    }
    // Front center plate
    addMesh(rig.pelvis, new THREE.BoxGeometry(0.18 * S, 0.28 * S, 0.04 * S), oniArmorTrimMat,
      new THREE.Vector3(0, -0.14 * S, 0.17 * S)
    );

    // Waist cloth (loincloth)
    const clothGeo = new THREE.PlaneGeometry(0.3 * S, 0.4 * S);
    const frontCloth = addMesh(rig.pelvis, clothGeo, oniClothMat,
      new THREE.Vector3(0, -0.25 * S, 0.18 * S)
    );
    frontCloth.rotation.x = 0.1;

    const backCloth = addMesh(rig.pelvis, clothGeo, oniClothMat,
      new THREE.Vector3(0, -0.25 * S, -0.18 * S)
    );
    backCloth.rotation.x = -0.1;

    // ─── SPINE ──────────────────────────────────────────────────────
    const spineGeo = new THREE.BoxGeometry(0.45 * S, 0.3 * S, 0.32 * S);
    addMesh(rig.spine, spineGeo, oniSkinMat);

    // ─── CHEST ──────────────────────────────────────────────────────
    const chestGeo = new THREE.BoxGeometry(0.55 * S, 0.4 * S, 0.38 * S);
    // Taper bottom for V-shape
    const cPos = chestGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      if (cPos.getY(i) < 0) {
        cPos.setX(i, cPos.getX(i) * 0.75);
      }
    }
    chestGeo.computeVertexNormals();
    addMesh(rig.chest, chestGeo, oniSkinMat);

    // Chest armor plate
    const chestArmorGeo = new THREE.BoxGeometry(0.5 * S, 0.3 * S, 0.4 * S);
    addMesh(rig.chest, chestArmorGeo, oniArmorMat,
      new THREE.Vector3(0, 0.03 * S, 0)
    );
    // Crimson trim on armor
    addMesh(rig.chest, new THREE.BoxGeometry(0.52 * S, 0.04 * S, 0.42 * S), oniArmorTrimMat,
      new THREE.Vector3(0, 0.16 * S, 0)
    );

    // Supernatural core — glowing orb in chest
    const coreGeo = new THREE.SphereGeometry(0.08 * S, 12, 12);
    addMesh(rig.chest, coreGeo, oniCoreMat,
      new THREE.Vector3(0, 0.08 * S, 0.2 * S)
    );

    // ─── NECK ───────────────────────────────────────────────────────
    const neckGeo = new THREE.CylinderGeometry(0.1 * S, 0.14 * S, 0.18 * S, 8);
    addMesh(rig.neck, neckGeo, oniSkinMat, new THREE.Vector3(0, 0.09 * S, 0));

    // ─── HEAD ───────────────────────────────────────────────────────
    this.buildHead(rig, addMesh, S);

    // ─── ARMS ───────────────────────────────────────────────────────
    this.buildArms(rig, addMesh, S);

    // ─── LEGS ───────────────────────────────────────────────────────
    this.buildLegs(rig, addMesh, S);

    // ─── WEAPON (KANABO) ────────────────────────────────────────────
    this.buildKanabo(rig, addMesh, S);

    return rig;
  }

  // ─── HEAD BUILDER ─────────────────────────────────────────────────────────

  private static buildHead(
    rig: CharacterRig,
    addMesh: (p: THREE.Group, g: THREE.BufferGeometry, m: THREE.Material, pos?: THREE.Vector3, rot?: THREE.Euler) => THREE.Mesh,
    S: number
  ): void {
    // Main head — angular and broad
    const headGeo = new THREE.BoxGeometry(0.3 * S, 0.28 * S, 0.28 * S);
    addMesh(rig.head, headGeo, oniSkinMat, new THREE.Vector3(0, 0.14 * S, 0));

    // Brow ridge
    addMesh(rig.head, new THREE.BoxGeometry(0.32 * S, 0.06 * S, 0.15 * S), oniSkinMat,
      new THREE.Vector3(0, 0.26 * S, 0.08 * S)
    );

    // Jaw — protruding
    const jawGeo = new THREE.BoxGeometry(0.26 * S, 0.1 * S, 0.2 * S);
    addMesh(rig.head, jawGeo, oniSkinMat,
      new THREE.Vector3(0, 0.02 * S, 0.04 * S)
    );

    // Teeth — small cones along jaw
    const toothGeo = new THREE.ConeGeometry(0.015 * S, 0.04 * S, 4);
    for (let i = -2; i <= 2; i++) {
      addMesh(rig.head, toothGeo, oniTeethMat,
        new THREE.Vector3(i * 0.04 * S, -0.02 * S, 0.13 * S),
        new THREE.Euler(Math.PI, 0, 0)
      );
    }
    // Upper fangs (larger)
    const fangGeo = new THREE.ConeGeometry(0.02 * S, 0.06 * S, 4);
    addMesh(rig.head, fangGeo, oniTeethMat,
      new THREE.Vector3(-0.08 * S, 0.04 * S, 0.13 * S),
      new THREE.Euler(Math.PI, 0, 0)
    );
    addMesh(rig.head, fangGeo, oniTeethMat,
      new THREE.Vector3(0.08 * S, 0.04 * S, 0.13 * S),
      new THREE.Euler(Math.PI, 0, 0)
    );

    // Eyes — glowing
    const eyeGeo = new THREE.SphereGeometry(0.03 * S, 8, 8);
    addMesh(rig.head, eyeGeo, oniEyeMat,
      new THREE.Vector3(-0.08 * S, 0.2 * S, 0.13 * S)
    );
    addMesh(rig.head, eyeGeo, oniEyeMat,
      new THREE.Vector3(0.08 * S, 0.2 * S, 0.13 * S)
    );

    // Horns — curved using LatheGeometry
    this.buildHorn(rig.head, S, 1);  // Left horn
    this.buildHorn(rig.head, S, -1); // Right horn

    // Hair — layered planes flowing backward
    const hairBaseGeo = new THREE.BoxGeometry(0.28 * S, 0.15 * S, 0.2 * S);
    addMesh(rig.head, hairBaseGeo, oniHairMat,
      new THREE.Vector3(0, 0.28 * S, -0.06 * S)
    );
    // Flowing hair strands
    for (let i = 0; i < 5; i++) {
      const strandGeo = new THREE.PlaneGeometry(0.06 * S, 0.35 * S);
      const strand = addMesh(rig.head, strandGeo, oniHairMat,
        new THREE.Vector3((i - 2) * 0.06 * S, 0.1 * S, -0.16 * S),
        new THREE.Euler(-0.3 - i * 0.05, 0, (i - 2) * 0.05)
      );
      (strand.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    }

    // Ears — small triangles
    const earGeo = new THREE.ConeGeometry(0.04 * S, 0.08 * S, 3);
    addMesh(rig.head, earGeo, oniSkinMat,
      new THREE.Vector3(-0.16 * S, 0.16 * S, 0),
      new THREE.Euler(0, 0, -0.3)
    );
    addMesh(rig.head, earGeo, oniSkinMat,
      new THREE.Vector3(0.16 * S, 0.16 * S, 0),
      new THREE.Euler(0, 0, 0.3)
    );
  }

  /**
   * Build a single curved horn using LatheGeometry.
   */
  private static buildHorn(head: THREE.Group, S: number, side: number): void {
    // Profile curve for the horn — tapers from base to tip
    const points: THREE.Vector2[] = [];
    const segments = 8;
    const hornLength = 0.4 * S;
    const baseRadius = 0.05 * S;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const radius = baseRadius * (1 - t * 0.85); // Taper
      const y = t * hornLength;
      points.push(new THREE.Vector2(radius, y));
    }

    const hornGeo = new THREE.LatheGeometry(points, 8);
    const horn = new THREE.Mesh(hornGeo, oniHornMat);
    horn.castShadow = true;

    // Position and curve the horn
    horn.position.set(side * 0.1 * S, 0.3 * S, -0.02 * S);
    // Tilt outward and slightly forward
    horn.rotation.set(-0.2, 0, side * 0.4);

    head.add(horn);
  }

  // ─── ARMS BUILDER ─────────────────────────────────────────────────────────

  private static buildArms(
    rig: CharacterRig,
    addMesh: (p: THREE.Group, g: THREE.BufferGeometry, m: THREE.Material, pos?: THREE.Vector3, rot?: THREE.Euler) => THREE.Mesh,
    S: number
  ): void {
    // Upper arms — massive
    const upperArmGeo = new THREE.BoxGeometry(0.18 * S, 0.4 * S, 0.18 * S);
    upperArmGeo.translate(0, -0.2 * S, 0);
    addMesh(rig.leftUpperArm, upperArmGeo, oniSkinMat);
    addMesh(rig.rightUpperArm, upperArmGeo, oniSkinMat);

    // Shoulder armor (Sode) — layered plates
    const shoulderGeo = new THREE.BoxGeometry(0.25 * S, 0.12 * S, 0.22 * S);
    const lShoulder = addMesh(rig.leftUpperArm, shoulderGeo, oniArmorMat,
      new THREE.Vector3(0.03 * S, -0.02 * S, 0)
    );
    lShoulder.rotation.z = -0.15;
    // Second layer
    addMesh(rig.leftUpperArm, new THREE.BoxGeometry(0.22 * S, 0.08 * S, 0.2 * S), oniArmorTrimMat,
      new THREE.Vector3(0.03 * S, -0.08 * S, 0)
    );

    const rShoulder = addMesh(rig.rightUpperArm, shoulderGeo, oniArmorMat,
      new THREE.Vector3(-0.03 * S, -0.02 * S, 0)
    );
    rShoulder.rotation.z = 0.15;
    addMesh(rig.rightUpperArm, new THREE.BoxGeometry(0.22 * S, 0.08 * S, 0.2 * S), oniArmorTrimMat,
      new THREE.Vector3(-0.03 * S, -0.08 * S, 0)
    );

    // Shoulder cloth drape
    const shoulderDrapeGeo = new THREE.PlaneGeometry(0.2 * S, 0.3 * S);
    const lDrape = addMesh(rig.leftUpperArm, shoulderDrapeGeo, oniClothMat,
      new THREE.Vector3(0.1 * S, -0.15 * S, 0)
    );
    lDrape.rotation.z = -0.3;
    (lDrape.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;

    // Lower arms — thick forearms
    const lowerArmGeo = new THREE.BoxGeometry(0.16 * S, 0.35 * S, 0.16 * S);
    lowerArmGeo.translate(0, -0.175 * S, 0);
    addMesh(rig.leftLowerArm, lowerArmGeo, oniSkinMat);
    addMesh(rig.rightLowerArm, lowerArmGeo, oniSkinMat);

    // Wrist guards (Kote)
    const wristGuardGeo = new THREE.BoxGeometry(0.18 * S, 0.12 * S, 0.18 * S);
    wristGuardGeo.translate(0, -0.12 * S, 0);
    addMesh(rig.leftLowerArm, wristGuardGeo, oniArmorMat);
    addMesh(rig.rightLowerArm, wristGuardGeo, oniArmorMat);

    // Hands — large with clawed fingers
    const handGeo = new THREE.BoxGeometry(0.12 * S, 0.15 * S, 0.12 * S);
    handGeo.translate(0, -0.075 * S, 0);
    addMesh(rig.leftHand, handGeo, oniSkinMat);
    addMesh(rig.rightHand, handGeo, oniSkinMat);

    // Claws
    const clawGeo = new THREE.ConeGeometry(0.012 * S, 0.06 * S, 4);
    for (let finger = -1; finger <= 1; finger++) {
      // Left hand claws
      addMesh(rig.leftHand, clawGeo, oniTeethMat,
        new THREE.Vector3(finger * 0.03 * S, -0.16 * S, 0.04 * S),
        new THREE.Euler(0.4, 0, 0)
      );
      // Right hand claws
      addMesh(rig.rightHand, clawGeo, oniTeethMat,
        new THREE.Vector3(finger * 0.03 * S, -0.16 * S, 0.04 * S),
        new THREE.Euler(0.4, 0, 0)
      );
    }
  }

  // ─── LEGS BUILDER ─────────────────────────────────────────────────────────

  private static buildLegs(
    rig: CharacterRig,
    addMesh: (p: THREE.Group, g: THREE.BufferGeometry, m: THREE.Material, pos?: THREE.Vector3, rot?: THREE.Euler) => THREE.Mesh,
    S: number
  ): void {
    // Upper legs — powerful
    const upperLegGeo = new THREE.BoxGeometry(0.22 * S, 0.55 * S, 0.22 * S);
    upperLegGeo.translate(0, -0.275 * S, 0);
    addMesh(rig.leftUpperLeg, upperLegGeo, oniClothMat);
    addMesh(rig.rightUpperLeg, upperLegGeo, oniClothMat);

    // Leg armor (Suneate) — shin guards
    const shinGuardGeo = new THREE.BoxGeometry(0.2 * S, 0.18 * S, 0.15 * S);
    addMesh(rig.leftUpperLeg, shinGuardGeo, oniArmorMat,
      new THREE.Vector3(0, -0.2 * S, 0.05 * S)
    );
    addMesh(rig.rightUpperLeg, shinGuardGeo, oniArmorMat,
      new THREE.Vector3(0, -0.2 * S, 0.05 * S)
    );

    // Lower legs
    const lowerLegGeo = new THREE.BoxGeometry(0.18 * S, 0.5 * S, 0.18 * S);
    lowerLegGeo.translate(0, -0.25 * S, 0);
    addMesh(rig.leftLowerLeg, lowerLegGeo, oniSkinMat);
    addMesh(rig.rightLowerLeg, lowerLegGeo, oniSkinMat);

    // Feet — broad
    const footGeo = new THREE.BoxGeometry(0.18 * S, 0.1 * S, 0.3 * S);
    footGeo.translate(0, -0.05 * S, 0.06 * S);
    addMesh(rig.leftFoot, footGeo, oniSkinMat);
    addMesh(rig.rightFoot, footGeo, oniSkinMat);
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
    const handleGeo = new THREE.CylinderGeometry(0.03 * S, 0.035 * S, 0.8 * S, 8);
    addMesh(weaponGroup, handleGeo, oniWeaponWrapMat, new THREE.Vector3(0, -0.4 * S, 0));

    // Handle wrapping rings
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.TorusGeometry(0.04 * S, 0.008 * S, 6, 12);
      addMesh(weaponGroup, ringGeo, oniArmorTrimMat,
        new THREE.Vector3(0, -0.15 * S - i * 0.15 * S, 0),
        new THREE.Euler(Math.PI / 2, 0, 0)
      );
    }

    // Shaft body — octagonal, tapered
    const shaftGeo = new THREE.CylinderGeometry(0.06 * S, 0.08 * S, 1.8 * S, 8);
    addMesh(weaponGroup, shaftGeo, oniWeaponMetalMat, new THREE.Vector3(0, 0.9 * S, 0));

    // Metal spikes along the shaft
    const spikeGeo = new THREE.ConeGeometry(0.02 * S, 0.08 * S, 4);
    const spikeRows = 6;
    const spikesPerRow = 4;

    for (let row = 0; row < spikeRows; row++) {
      const y = 0.2 * S + row * 0.25 * S;
      for (let spike = 0; spike < spikesPerRow; spike++) {
        const angle = (spike / spikesPerRow) * Math.PI * 2 + (row % 2) * (Math.PI / spikesPerRow);
        const radius = 0.075 * S;

        const spikeMesh = new THREE.Mesh(spikeGeo, oniWeaponSpikeMat);
        spikeMesh.position.set(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        );
        // Point outward
        spikeMesh.rotation.z = -Math.cos(angle) * Math.PI / 2;
        spikeMesh.rotation.x = Math.sin(angle) * Math.PI / 2;
        spikeMesh.castShadow = true;
        weaponGroup.add(spikeMesh);
      }
    }

    // Pommel — cap at bottom
    const pommelGeo = new THREE.SphereGeometry(0.04 * S, 8, 8);
    addMesh(weaponGroup, pommelGeo, oniWeaponMetalMat, new THREE.Vector3(0, -0.82 * S, 0));

    // Top cap
    const topCapGeo = new THREE.SphereGeometry(0.07 * S, 8, 8);
    addMesh(weaponGroup, topCapGeo, oniWeaponMetalMat, new THREE.Vector3(0, 1.82 * S, 0));

    // Attach to weapon slot
    weaponGroup.rotation.x = -0.1; // Slight tilt when held
    rig.weaponSlot.add(weaponGroup);
  }
}
