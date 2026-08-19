import * as THREE from 'three';
import { CharacterRig } from '../characters/CharacterRig';

const darkSkinMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.9 });
const clothMat = new THREE.MeshStandardMaterial({ color: 0x221133, roughness: 1.0 }); // ragged purple
const hornMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 });
const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xaa1100, emissiveIntensity: 2.0 });
const clawMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.2 });

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
}
