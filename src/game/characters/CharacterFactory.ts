import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';

// Shared materials for the character
const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0c0a0, roughness: 0.5 });
const hairMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, flatShading: true });
const clothMat = new THREE.MeshStandardMaterial({ color: 0x1a2b3c, roughness: 0.9 }); // Dark teal robe
const armorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.2 }); // Charcoal armor
const accentMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.8 }); // Crimson accent
const bladeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.1 });
const wrapMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });

export class CharacterFactory {
  public static createRonin(): CharacterRig {
    const rig = new CharacterRig();

    // ─── HELPER FUNCTIONS ──────────────────────────────────────────
    const addMesh = (parent: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, yOffset = 0, scale = 1) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = yOffset;
      mesh.scale.set(scale, scale, scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // ─── GEOMETRIES ────────────────────────────────────────────────
    // Torso / Robe
    const pelvisGeo = new THREE.BoxGeometry(0.35, 0.2, 0.25);
    const spineGeo = new THREE.BoxGeometry(0.32, 0.25, 0.22);
    const chestGeo = new THREE.BoxGeometry(0.4, 0.35, 0.28);
    // Tapered chest (V-shape)
    const chestPos = chestGeo.attributes.position;
    for(let i=0; i<chestPos.count; i++) {
      if (chestPos.getY(i) < 0) {
        chestPos.setX(i, chestPos.getX(i) * 0.8);
      }
    }
    chestGeo.computeVertexNormals();

    const neckGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.15, 8);
    const headGeo = new THREE.BoxGeometry(0.2, 0.25, 0.22);
    
    // Limbs
    const upperArmGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
    upperArmGeo.translate(0, -0.175, 0); // Origin at shoulder
    
    const lowerArmGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    lowerArmGeo.translate(0, -0.15, 0); // Origin at elbow
    
    const handGeo = new THREE.BoxGeometry(0.08, 0.12, 0.08);
    handGeo.translate(0, -0.06, 0); // Origin at wrist

    const upperLegGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    upperLegGeo.translate(0, -0.25, 0); // Origin at hip
    
    const lowerLegGeo = new THREE.BoxGeometry(0.14, 0.45, 0.14);
    lowerLegGeo.translate(0, -0.225, 0); // Origin at knee
    
    const footGeo = new THREE.BoxGeometry(0.12, 0.08, 0.25);
    footGeo.translate(0, -0.04, 0.05); // Origin at ankle

    // ─── ATTACH MESHES TO RIG ──────────────────────────────────────
    
    // Core
    addMesh(rig.pelvis, pelvisGeo, clothMat);
    
    // Obi (belt)
    const obi = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.28), accentMat);
    obi.position.y = 0.1;
    rig.pelvis.add(obi);

    addMesh(rig.spine, spineGeo, clothMat);
    
    // Chest + Armor
    addMesh(rig.chest, chestGeo, clothMat);
    const chestArmor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.25, 0.3), armorMat);
    chestArmor.position.y = 0.05;
    rig.chest.add(chestArmor);

    // Head & Neck
    addMesh(rig.neck, neckGeo, skinMat, 0.075);
    addMesh(rig.head, headGeo, skinMat, 0.125);

    // Hair & Topknot
    const hairGeo = new THREE.BoxGeometry(0.22, 0.1, 0.24);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.26;
    
    const topKnotGeo = new THREE.BoxGeometry(0.06, 0.1, 0.08);
    topKnotGeo.translate(0, 0.05, -0.05);
    topKnotGeo.rotateX(-0.4);
    const topKnot = new THREE.Mesh(topKnotGeo, hairMat);
    topKnot.position.set(0, 0.05, -0.08);
    hair.add(topKnot);
    rig.head.add(hair);

    // Arms
    addMesh(rig.leftUpperArm, upperArmGeo, clothMat);
    addMesh(rig.rightUpperArm, upperArmGeo, clothMat);
    
    // Shoulder armor (Sode)
    const shoulderGeo = new THREE.BoxGeometry(0.18, 0.25, 0.2);
    const lShoulder = new THREE.Mesh(shoulderGeo, armorMat);
    lShoulder.position.set(0.05, -0.05, 0);
    lShoulder.rotation.z = -0.2;
    rig.leftUpperArm.add(lShoulder);
    
    const rShoulder = new THREE.Mesh(shoulderGeo, armorMat);
    rShoulder.position.set(-0.05, -0.05, 0);
    rShoulder.rotation.z = 0.2;
    rig.rightUpperArm.add(rShoulder);

    addMesh(rig.leftLowerArm, lowerArmGeo, skinMat);
    addMesh(rig.rightLowerArm, lowerArmGeo, skinMat);
    
    // Arm guards (Kote)
    const guardGeo = new THREE.BoxGeometry(0.12, 0.2, 0.12);
    guardGeo.translate(0, -0.1, 0);
    const lGuard = new THREE.Mesh(guardGeo, armorMat);
    lGuard.position.y = -0.05;
    rig.leftLowerArm.add(lGuard);
    
    const rGuard = new THREE.Mesh(guardGeo, armorMat);
    rGuard.position.y = -0.05;
    rig.rightLowerArm.add(rGuard);

    addMesh(rig.leftHand, handGeo, skinMat);
    addMesh(rig.rightHand, handGeo, skinMat);

    // Legs (Hakama trousers)
    addMesh(rig.leftUpperLeg, upperLegGeo, clothMat);
    addMesh(rig.rightUpperLeg, upperLegGeo, clothMat);
    addMesh(rig.leftLowerLeg, lowerLegGeo, clothMat);
    addMesh(rig.rightLowerLeg, lowerLegGeo, clothMat);

    // Feet (Sandals)
    addMesh(rig.leftFoot, footGeo, wrapMat);
    addMesh(rig.rightFoot, footGeo, wrapMat);

    // ─── KATANA ────────────────────────────────────────────────────
    
    // Sheath (Saya)
    const sheathGeo = new THREE.BoxGeometry(0.05, 0.08, 1.0);
    sheathGeo.translate(0, 0, -0.4);
    const sheath = new THREE.Mesh(sheathGeo, armorMat);
    rig.sheathSlot.add(sheath);

    // Weapon (Katana) in hand
    const weaponGroup = new THREE.Group();
    
    // Handle (Tsuka)
    const handleGeo = new THREE.BoxGeometry(0.04, 0.05, 0.25);
    handleGeo.translate(0, 0, 0.125);
    const handle = new THREE.Mesh(handleGeo, wrapMat);
    weaponGroup.add(handle);

    // Guard (Tsuba)
    const guardMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8), accentMat);
    guardMesh.rotation.x = Math.PI / 2;
    guardMesh.position.z = 0.26;
    weaponGroup.add(guardMesh);

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.015, 0.04, 0.8);
    bladeGeo.translate(0, 0, 0.4);
    
    // Curve the blade slightly
    const bPos = bladeGeo.attributes.position;
    for(let i=0; i<bPos.count; i++) {
      const z = bPos.getZ(i);
      if (z > 0.1) {
        bPos.setY(i, bPos.getY(i) + Math.pow(z * 0.8, 2) * 0.05);
      }
      // Taper tip
      if (z > 0.75 && bPos.getY(i) > 0) {
        bPos.setY(i, 0);
      }
    }
    bladeGeo.computeVertexNormals();
    
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.z = 0.27;
    weaponGroup.add(blade);

    // Position katana in hand (held pointing forward)
    weaponGroup.rotation.x = Math.PI / 2;
    weaponGroup.position.set(0, -0.05, 0.05);
    rig.weaponSlot.add(weaponGroup);

    return rig;
  }
}
