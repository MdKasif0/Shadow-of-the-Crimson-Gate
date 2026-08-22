import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';

// Shared materials for the character
const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfbca3, roughness: 0.6 });
const hairMat = new THREE.MeshStandardMaterial({ color: 0x0f0f11, roughness: 0.9, flatShading: true });
const maskMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 });
const robeMat = new THREE.MeshStandardMaterial({ color: 0x1f1f22, roughness: 0.95 }); // Dark charcoal/black
const hakamaMat = new THREE.MeshStandardMaterial({ color: 0x151518, roughness: 0.9 }); // Slightly darker baggy pants
const armorMat = new THREE.MeshStandardMaterial({ color: 0x202022, roughness: 0.6, metalness: 0.5 }); // Dark metallic armor
const redClothMat = new THREE.MeshStandardMaterial({ color: 0x8a1515, roughness: 0.9 }); // Deep crimson for sash/cape
const goldMat = new THREE.MeshStandardMaterial({ color: 0xb5954a, roughness: 0.3, metalness: 0.9 }); // Ornate accents
const wrapMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 }); // Black hand/foot wraps

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
    
    // Core body (Robes)
    const pelvisGeo = new THREE.BoxGeometry(0.35, 0.2, 0.25);
    const spineGeo = new THREE.BoxGeometry(0.32, 0.25, 0.22);
    const chestGeo = new THREE.BoxGeometry(0.42, 0.35, 0.28);
    // Tapered chest (V-shape)
    const chestPos = chestGeo.attributes.position;
    for(let i=0; i<chestPos.count; i++) {
      if (chestPos.getY(i) < 0) {
        chestPos.setX(i, chestPos.getX(i) * 0.8);
      }
    }
    chestGeo.computeVertexNormals();

    const neckGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.15, 8);
    const headGeo = new THREE.BoxGeometry(0.18, 0.22, 0.2);
    
    // Hair & Mask
    const maskGeo = new THREE.BoxGeometry(0.19, 0.12, 0.21);
    const hairGeo = new THREE.BoxGeometry(0.2, 0.08, 0.22);
    
    // Limbs
    const upperArmGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
    upperArmGeo.translate(0, -0.175, 0); 
    const lowerArmGeo = new THREE.BoxGeometry(0.11, 0.3, 0.11);
    lowerArmGeo.translate(0, -0.15, 0); 
    const handGeo = new THREE.BoxGeometry(0.08, 0.12, 0.08);
    handGeo.translate(0, -0.06, 0);

    // Legs (Hakama - Baggy at top, tight at shin)
    const upperLegGeo = new THREE.BoxGeometry(0.24, 0.5, 0.24); // Baggy
    upperLegGeo.translate(0, -0.25, 0); 
    const lowerLegGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12); // Tight
    lowerLegGeo.translate(0, -0.225, 0); 
    const footGeo = new THREE.BoxGeometry(0.12, 0.08, 0.25);
    footGeo.translate(0, -0.04, 0.05);

    // ─── ATTACH MESHES TO RIG ──────────────────────────────────────
    
    // --- PELVIS (Waist) ---
    addMesh(rig.pelvis, pelvisGeo, hakamaMat);
    // Red Obi (Sash)
    const obi = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.28), redClothMat);
    obi.position.y = 0.08;
    obi.castShadow = true;
    rig.pelvis.add(obi);
    // Rope/Cord around Obi
    const obiCord = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 16), wrapMat);
    obiCord.position.y = 0.08;
    obiCord.rotation.z = Math.PI/2;
    obiCord.rotation.x = Math.PI/2;
    rig.pelvis.add(obiCord);
    // Torn red cloth hanging from waist
    const waistCloth1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.02), redClothMat);
    waistCloth1.position.set(0.1, -0.2, 0.15);
    waistCloth1.rotation.set(0.2, 0, 0.1);
    rig.pelvis.add(waistCloth1);
    const waistCloth2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.02), redClothMat);
    waistCloth2.position.set(-0.15, -0.25, -0.15);
    waistCloth2.rotation.set(-0.3, 0.2, -0.1);
    rig.pelvis.add(waistCloth2);

    // --- SPINE & CHEST ---
    addMesh(rig.spine, spineGeo, robeMat);
    addMesh(rig.chest, chestGeo, robeMat);
    
    // Red lapels (inner robe)
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.02), redClothMat);
    lapel.position.set(0.05, 0, 0.145);
    lapel.rotation.z = 0.4;
    rig.chest.add(lapel);
    const lapel2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.02), redClothMat);
    lapel2.position.set(-0.05, 0, 0.142);
    lapel2.rotation.z = -0.4;
    rig.chest.add(lapel2);

    // Chest Armor (Do)
    const chestArmorGeo = new THREE.BoxGeometry(0.44, 0.22, 0.3);
    const chestArmor = new THREE.Mesh(chestArmorGeo, armorMat);
    chestArmor.position.y = -0.05;
    chestArmor.castShadow = true;
    rig.chest.add(chestArmor);
    
    // Gold emblem on chest armor
    const emblem = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 8, 16), goldMat);
    emblem.position.set(0, 0, 0.155);
    chestArmor.add(emblem);

    // Flowing torn scarf from neck
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.02), redClothMat);
    scarf.position.set(-0.1, 0.1, -0.2);
    scarf.rotation.set(-0.5, 0.2, 0.3);
    rig.chest.add(scarf);

    // --- HEAD & NECK ---
    addMesh(rig.neck, neckGeo, skinMat, 0.075);
    
    // Neck scarf
    const neckScarf = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 8), robeMat);
    neckScarf.position.y = 0.05;
    rig.neck.add(neckScarf);

    addMesh(rig.head, headGeo, skinMat, 0.11);
    
    // Face Mask (Lower half)
    const mask = new THREE.Mesh(maskGeo, maskMat);
    mask.position.set(0, 0.06, 0.01);
    rig.head.add(mask);

    // Hair Top
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.25;
    rig.head.add(hair);

    // Bangs over forehead
    const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), hairMat);
    bangs.position.set(0, 0.2, 0.1);
    bangs.rotation.x = -0.2;
    rig.head.add(bangs);
    
    // Flowing Ponytail
    const ponytailRoot = new THREE.Group();
    ponytailRoot.position.set(0, 0.26, -0.08);
    ponytailRoot.rotation.x = 0.5; // Angled back
    rig.head.add(ponytailRoot);
    
    const ponyTie = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), redClothMat);
    ponyTie.rotation.x = Math.PI/2;
    ponytailRoot.add(ponyTie);
    
    const ponyGeo = new THREE.CylinderGeometry(0.05, 0.01, 0.4, 8);
    ponyGeo.translate(0, 0.2, 0); // Origin at tie
    const ponyMesh = new THREE.Mesh(ponyGeo, hairMat);
    ponyMesh.position.y = -0.4;
    ponyMesh.rotation.x = Math.PI; // Point down/back
    ponytailRoot.add(ponyMesh);

    // --- ARMS ---
    addMesh(rig.leftUpperArm, upperArmGeo, robeMat);
    addMesh(rig.rightUpperArm, upperArmGeo, robeMat);
    
    // Shoulder Armor (Sode) - 3 overlapping tiered plates
    const createSode = (side: 1 | -1) => {
      const sodeGroup = new THREE.Group();
      sodeGroup.position.set(side * 0.08, -0.02, 0);
      sodeGroup.rotation.z = side * -0.2;
      for(let i=0; i<3; i++) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.22), armorMat);
        plate.position.set(side * 0.02, -i * 0.07, 0);
        plate.rotation.z = side * 0.1 * i;
        
        // Gold trim
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.182, 0.02, 0.222), goldMat);
        trim.position.y = -0.03;
        plate.add(trim);
        
        sodeGroup.add(plate);
      }
      return sodeGroup;
    };
    rig.leftUpperArm.add(createSode(1));
    rig.rightUpperArm.add(createSode(-1));

    // Lower arms & Gauntlets (Kote)
    addMesh(rig.leftLowerArm, lowerArmGeo, robeMat);
    addMesh(rig.rightLowerArm, lowerArmGeo, robeMat);
    
    const createKote = () => {
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.25, 0.13), armorMat);
      guard.position.y = -0.12;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.132, 0.02, 0.132), goldMat);
      trim.position.y = -0.1;
      guard.add(trim);
      
      // Hand wraps (thin box above hand)
      const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.11), wrapMat);
      wrap.position.y = -0.28;
      guard.add(wrap);
      return guard;
    };
    rig.leftLowerArm.add(createKote());
    rig.rightLowerArm.add(createKote());

    // Hands
    addMesh(rig.leftHand, handGeo, wrapMat); // Wrap the hands too
    addMesh(rig.rightHand, handGeo, wrapMat);

    // --- LEGS ---
    // Baggy Hakama upper legs
    addMesh(rig.leftUpperLeg, upperLegGeo, hakamaMat);
    addMesh(rig.rightUpperLeg, upperLegGeo, hakamaMat);
    
    // Tight lower legs (Kyahan)
    addMesh(rig.leftLowerLeg, lowerLegGeo, wrapMat);
    addMesh(rig.rightLowerLeg, lowerLegGeo, wrapMat);
    
    // Red rope ties on shins
    const createTies = () => {
      const tieGroup = new THREE.Group();
      tieGroup.position.y = -0.225;
      for(let i=0; i<3; i++) {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.02, 0.125), redClothMat);
        tie.position.y = (i - 1) * 0.1;
        tie.rotation.y = Math.PI / 4;
        tieGroup.add(tie);
      }
      return tieGroup;
    };
    rig.leftLowerLeg.add(createTies());
    rig.rightLowerLeg.add(createTies());

    // Feet (Tabi socks)
    addMesh(rig.leftFoot, footGeo, wrapMat);
    addMesh(rig.rightFoot, footGeo, wrapMat);

    return rig;
  }
}
