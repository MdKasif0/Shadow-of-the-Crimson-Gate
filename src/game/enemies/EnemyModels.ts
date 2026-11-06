import * as THREE from 'three';
import { CharacterRig } from '../characters/CharacterRig';
import { ArtJoints, ModelSheet, poseFromArt, ReferenceModel } from '../characters/ReferenceModel';

/**
 * The enemies, traced from their concept art. All positions are image pixels.
 *
 * Each animator sets the pelvis height and the chest's offset directly, so the
 * joints are placed to agree with those numbers: `pelvisY` below, and the chest
 * always 0.25 above the spine. Overall size then comes from scaling the root.
 */

const sheet = (textures: string, centerX: number, groundY: number, pixelsPerUnit: number, brightness: number): ModelSheet => ({
  textures, centerX, groundY, pixelsPerUnit, brightness, imageWidth: 1024, imageHeight: 1536, separateAlpha: true,
});

const glowing = (color: number, intensity: number) => new THREE.MeshStandardMaterial({
  color, emissive: color, emissiveIntensity: intensity,
});

function finishRig(model: ReferenceModel, rig: CharacterRig, scale: number): CharacterRig {
  model.finish();
  rig.root.scale.setScalar(scale);
  return rig;
}

// ─── Basic Yokai ─────────────────────────────────────────────────────────────

const YOKAI_SHEET = sheet('/assets/characters/yokai/yokai', 480, 1440, 740, 1.7);

const YOKAI_JOINTS: ArtJoints = {
  pelvisY: 1.0,
  spineRise: 0.05,
  neck: [478, 345], head: [462, 322],
  leftShoulder: [690, 380], leftElbow: [795, 590], leftHand: [825, 745],
  rightShoulder: [365, 400], rightElbow: [290, 560], rightHand: [205, 735],
  leftHip: [570, 720], leftKnee: [645, 1040], leftFoot: [660, 1330],
  rightHip: [395, 720], rightKnee: [360, 1040], rightFoot: [360, 1310],
};

export function buildBasicYokai(): CharacterRig {
  const rig = new CharacterRig();
  poseFromArt(rig, YOKAI_SHEET, YOKAI_JOINTS);
  const model = new ReferenceModel(rig.root, YOKAI_SHEET);
  const eyeMaterial = glowing(0xff1a08, 3.5);

  model.tube(rig.chest, [
    { x: 478, y: 320, hw: 88 }, { x: 490, y: 400, hw: 158 },
    { x: 488, y: 480, hw: 132 }, { x: 490, y: 565, hw: 118 },
  ], { depth: 0.58, z: 0.01 });
  model.tube(rig.spine, [
    { x: 490, y: 540, hw: 108 }, { x: 495, y: 625, hw: 128 }, { x: 495, y: 705, hw: 132 },
  ], { depth: 0.62, z: 0.01 });
  model.tube(rig.pelvis, [
    { x: 495, y: 680, hw: 126 }, { x: 490, y: 780, hw: 150 }, { x: 490, y: 920, hw: 170 },
  ], { depth: 0.56 });

  // The torn kilt, front and back, and the ragged sleeve
  const kilt: [number, number][] = [[350, 690], [650, 690], [725, 1185], [278, 1185]];
  model.panel(rig.pelvis, kilt, { z: 0.15, bend: 0.2, lean: 0.02, material: 'cloth', columns: 8, rows: 8 });
  model.panel(rig.pelvis, kilt, { z: -0.15, bend: -0.2, lean: -0.02, material: 'cloth', columns: 8, rows: 8 });
  model.panel(rig.leftUpperArm, [[645, 472], [785, 472], [765, 705], [640, 700]], { z: 0.05, material: 'cloth', bend: 0.04, columns: 5, rows: 5 });
  model.panel(rig.chest, [[545, 300], [660, 330], [640, 600], [535, 600]], { z: 0.1, bend: 0.03, material: 'cloth', columns: 4, rows: 6 });

  // Head, horns and the hair and ears around it
  model.tube(rig.head, [
    { x: 462, y: 132, hw: 34 }, { x: 460, y: 165, hw: 58 }, { x: 452, y: 240, hw: 58 },
    { x: 450, y: 300, hw: 46 }, { x: 452, y: 352, hw: 26 },
  ], { depth: 1, z: 0.01, back: { x: 455, y: 150, hw: 22, hh: 12 } });
  model.panel(rig.head, [[350, 112], [600, 112], [600, 345], [350, 345]], { z: -0.05, material: 'cloth', columns: 5, rows: 5 });
  model.tube(rig.head, [
    { x: 408, y: 96, hw: 1.5 }, { x: 386, y: 130, hw: 9 }, { x: 382, y: 165, hw: 13 }, { x: 402, y: 192, hw: 13 },
  ], { segments: 8, z: 0.02 });
  model.tube(rig.head, [
    { x: 521, y: 88, hw: 1.5 }, { x: 535, y: 125, hw: 9 }, { x: 528, y: 165, hw: 13 }, { x: 506, y: 190, hw: 13 },
  ], { segments: 8, z: 0.02 });
  model.eyes(rig.head, [[417, 258], [483, 254]], 0.072, 0.008, eyeMaterial);

  // Arms: wiry, with the art's clawed hands as cut-outs over a palm
  model.tube(rig.leftUpperArm, [{ x: 700, y: 372, hw: 62 }, { x: 742, y: 472, hw: 48 }, { x: 797, y: 592, hw: 38 }]);
  model.tube(rig.leftLowerArm, [{ x: 797, y: 585, hw: 38 }, { x: 815, y: 680, hw: 30 }, { x: 826, y: 770, hw: 30 }]);
  model.tube(rig.leftHand, [{ x: 826, y: 745, hw: 26 }, { x: 838, y: 815, hw: 52 }, { x: 845, y: 870, hw: 46 }], { depth: 0.36 });
  model.panel(rig.leftHand, [[748, 745], [928, 745], [928, 982], [748, 982]], { z: 0, material: 'cloth', columns: 2, rows: 2 });

  model.tube(rig.rightUpperArm, [{ x: 365, y: 395, hw: 42 }, { x: 320, y: 480, hw: 46 }, { x: 288, y: 565, hw: 38 }]);
  model.tube(rig.rightLowerArm, [{ x: 288, y: 558, hw: 40 }, { x: 240, y: 660, hw: 32 }, { x: 203, y: 748, hw: 27 }]);
  model.tube(rig.rightHand, [{ x: 205, y: 735, hw: 26 }, { x: 175, y: 800, hw: 42 }, { x: 150, y: 850, hw: 40 }], { depth: 0.36 });
  model.panel(rig.rightHand, [[85, 730], [245, 730], [245, 955], [85, 955]], { z: 0, material: 'cloth', columns: 2, rows: 2 });

  // Legs
  model.tube(rig.leftUpperLeg, [{ x: 590, y: 800, hw: 70 }, { x: 625, y: 950, hw: 64 }, { x: 645, y: 1055, hw: 50 }]);
  model.tube(rig.leftLowerLeg, [
    { x: 645, y: 1035, hw: 50 }, { x: 650, y: 1130, hw: 45 }, { x: 655, y: 1215, hw: 38 },
    { x: 658, y: 1270, hw: 42 }, { x: 662, y: 1345, hw: 36 },
  ]);
  model.tube(rig.rightUpperLeg, [{ x: 365, y: 800, hw: 65 }, { x: 355, y: 950, hw: 60 }, { x: 360, y: 1055, hw: 48 }]);
  model.tube(rig.rightLowerLeg, [
    { x: 360, y: 1035, hw: 48 }, { x: 350, y: 1130, hw: 48 }, { x: 362, y: 1205, hw: 38 },
    { x: 362, y: 1260, hw: 40 }, { x: 362, y: 1325, hw: 36 },
  ]);
  const yokaiFoot = { x: 660, top: 1320, bottom: 1468, hw: 56 };
  model.foot(rig.leftFoot, yokaiFoot);
  model.foot(rig.rightFoot, yokaiFoot);

  return finishRig(model, rig, 1.15);
}

// ─── Shadow Yokai ────────────────────────────────────────────────────────────

const SHADOW_SHEET = sheet('/assets/characters/shadow-yokai/shadow', 480, 1450, 633, 2.1);

const SHADOW_JOINTS: ArtJoints = {
  pelvisY: 1.2,
  spineRise: 0.15,
  neck: [455, 320], head: [445, 300],
  leftShoulder: [640, 370], leftElbow: [720, 590], leftHand: [770, 730],
  rightShoulder: [350, 400], rightElbow: [290, 620], rightHand: [205, 745],
  leftHip: [545, 720], leftKnee: [590, 1010], leftFoot: [617, 1320],
  rightHip: [420, 720], rightKnee: [390, 1010], rightFoot: [385, 1320],
};

export function buildShadowYokai(): CharacterRig {
  const rig = new CharacterRig();
  poseFromArt(rig, SHADOW_SHEET, SHADOW_JOINTS);
  const model = new ReferenceModel(rig.root, SHADOW_SHEET);
  const eyeMaterial = glowing(0xff1208, 5);

  model.tube(rig.chest, [
    { x: 472, y: 285, hw: 76 }, { x: 480, y: 380, hw: 128 },
    { x: 475, y: 470, hw: 122 }, { x: 470, y: 565, hw: 98 },
  ], { depth: 0.55 });
  model.tube(rig.spine, [
    { x: 470, y: 540, hw: 100 }, { x: 465, y: 625, hw: 96 }, { x: 465, y: 710, hw: 104 },
  ], { depth: 0.62 });
  model.tube(rig.pelvis, [
    { x: 465, y: 690, hw: 104 }, { x: 468, y: 860, hw: 130 }, { x: 470, y: 1020, hw: 150 },
  ], { depth: 0.55 });

  // The long robe, its shreds and smoke cut straight from the art
  const robe: [number, number][] = [[350, 690], [610, 690], [860, 1385], [175, 1385]];
  model.panel(rig.pelvis, robe, { z: 0.11, bend: 0.2, lean: 0.03, material: 'cloth', columns: 8, rows: 10 });
  model.panel(rig.pelvis, robe, { z: -0.13, bend: -0.2, lean: -0.05, material: 'cloth', columns: 8, rows: 10 });

  // Upper robe and the rags trailing off each shoulder
  model.panel(rig.chest, [[560, 290], [860, 400], [850, 860], [560, 870]], { z: -0.05, material: 'cloth', columns: 5, rows: 8 });
  model.panel(rig.chest, [[260, 300], [400, 300], [395, 820], [262, 820]], { z: -0.05, material: 'cloth', columns: 3, rows: 8 });

  // The beaked head and the smoke rising from it
  model.tube(rig.head, [
    { x: 445, y: 112, hw: 22 }, { x: 445, y: 150, hw: 40 }, { x: 445, y: 215, hw: 36 }, { x: 448, y: 300, hw: 22 },
  ], { depth: 1.05, z: 0.01 });
  model.panel(rig.head, [[325, 38], [655, 38], [655, 320], [325, 320]], { z: -0.05, material: 'cloth', columns: 5, rows: 5 });
  model.eyes(rig.head, [[468, 196], [430, 197]], 0.058, 0.006, eyeMaterial);

  // Long, thin arms and claws
  model.tube(rig.leftUpperArm, [{ x: 642, y: 400, hw: 30 }, { x: 680, y: 490, hw: 26 }, { x: 722, y: 592, hw: 22 }]);
  model.tube(rig.leftLowerArm, [{ x: 722, y: 585, hw: 22 }, { x: 750, y: 660, hw: 20 }, { x: 772, y: 745, hw: 20 }]);
  model.tube(rig.leftHand, [{ x: 770, y: 730, hw: 18 }, { x: 780, y: 800, hw: 34 }, { x: 790, y: 860, hw: 30 }], { depth: 0.36 });
  model.panel(rig.leftHand, [[720, 730], [865, 730], [865, 1005], [720, 1005]], { z: 0, material: 'cloth', columns: 2, rows: 2 });

  model.tube(rig.rightUpperArm, [{ x: 348, y: 410, hw: 30 }, { x: 318, y: 520, hw: 24 }, { x: 288, y: 622, hw: 20 }]);
  model.tube(rig.rightLowerArm, [{ x: 288, y: 615, hw: 20 }, { x: 245, y: 685, hw: 18 }, { x: 205, y: 755, hw: 18 }]);
  model.tube(rig.rightHand, [{ x: 205, y: 745, hw: 16 }, { x: 180, y: 810, hw: 30 }, { x: 170, y: 860, hw: 26 }], { depth: 0.36 });
  model.panel(rig.rightHand, [[125, 740], [235, 740], [235, 970], [125, 970]], { z: 0, material: 'cloth', columns: 2, rows: 2 });

  // Legs below the robe
  model.tube(rig.leftUpperLeg, [{ x: 548, y: 760, hw: 52 }, { x: 575, y: 900, hw: 42 }, { x: 590, y: 1020, hw: 32 }]);
  model.tube(rig.leftLowerLeg, [{ x: 590, y: 1000, hw: 32 }, { x: 605, y: 1150, hw: 27 }, { x: 615, y: 1290, hw: 24 }, { x: 618, y: 1335, hw: 26 }]);
  model.tube(rig.rightUpperLeg, [{ x: 418, y: 760, hw: 52 }, { x: 400, y: 900, hw: 42 }, { x: 390, y: 1020, hw: 34 }]);
  model.tube(rig.rightLowerLeg, [{ x: 390, y: 1000, hw: 34 }, { x: 386, y: 1150, hw: 28 }, { x: 386, y: 1290, hw: 25 }, { x: 386, y: 1335, hw: 28 }]);
  const shadowFoot = { x: 618, top: 1325, bottom: 1482, hw: 42 };
  model.foot(rig.leftFoot, shadowFoot);
  model.foot(rig.rightFoot, shadowFoot);

  return finishRig(model, rig, 1.15);
}

// ─── Tengu ───────────────────────────────────────────────────────────────────

const TENGU_SHEET = sheet('/assets/characters/tengu/tengu', 505, 1440, 620, 1.6);

const TENGU_JOINTS: ArtJoints = {
  pelvisY: 1.1,
  spineRise: 0.15,
  neck: [508, 345], head: [508, 325],
  leftShoulder: [670, 410], leftElbow: [725, 590], leftHand: [735, 770],
  rightShoulder: [355, 420], rightElbow: [305, 600], rightHand: [265, 770],
  leftHip: [585, 800], leftKnee: [630, 1130], leftFoot: [655, 1385],
  rightHip: [430, 800], rightKnee: [395, 1130], rightFoot: [385, 1370],
};

export function buildTengu(): CharacterRig {
  const rig = new CharacterRig();
  poseFromArt(rig, TENGU_SHEET, TENGU_JOINTS);
  const model = new ReferenceModel(rig.root, TENGU_SHEET);
  const eyeMaterial = glowing(0xffa020, 3);

  model.tube(rig.chest, [
    { x: 505, y: 335, hw: 85 }, { x: 510, y: 400, hw: 165 }, { x: 510, y: 500, hw: 155 }, { x: 505, y: 595, hw: 130 },
  ], { depth: 0.6, z: 0.01 });
  model.tube(rig.spine, [
    { x: 505, y: 570, hw: 130 }, { x: 500, y: 640, hw: 140 }, { x: 505, y: 725, hw: 145 },
  ], { depth: 0.66, z: 0.01 });
  model.tube(rig.pelvis, [
    { x: 505, y: 700, hw: 150 }, { x: 510, y: 800, hw: 170 }, { x: 515, y: 950, hw: 188 },
  ], { depth: 0.62 });

  // Armoured skirt plates, and the coat's torn tails
  model.panel(rig.pelvis, [[350, 740], [510, 740], [512, 945], [350, 930]], { z: 0.17, bend: 0.03, lean: 0.03 });
  model.panel(rig.pelvis, [[558, 715], [672, 790], [705, 985], [602, 1002]], { z: 0.17, lean: 0.05, bend: 0.02 });
  model.panel(rig.pelvis, [[262, 860], [345, 860], [345, 1190], [262, 1190]], { z: -0.06, bend: 0.03, material: 'cloth', columns: 3, rows: 6 });
  model.panel(rig.pelvis, [[690, 870], [775, 870], [775, 1225], [690, 1225]], { z: -0.06, bend: 0.03, material: 'cloth', columns: 3, rows: 6 });

  // Shoulder guards
  model.tube(rig.leftUpperArm, [
    { x: 640, y: 350, hw: 30 }, { x: 680, y: 420, hw: 64 }, { x: 715, y: 480, hw: 44 },
  ], { depth: 0.8, z: 0.008 });
  model.tube(rig.rightUpperArm, [
    { x: 370, y: 355, hw: 28 }, { x: 345, y: 420, hw: 44 }, { x: 322, y: 482, hw: 30 },
  ], { depth: 0.85, z: 0.008 });

  // Head, long nose, and the hair and topknot
  model.tube(rig.head, [
    { x: 510, y: 165, hw: 34 }, { x: 510, y: 205, hw: 54 }, { x: 505, y: 262, hw: 56 }, { x: 505, y: 335, hw: 34 },
  ], { depth: 1, back: { x: 515, y: 175, hw: 22, hh: 10 } });
  model.panel(rig.head, [[425, 92], [660, 92], [660, 330], [425, 330]], { z: -0.05, material: 'cloth', columns: 5, rows: 5 });
  model.tube(rig.head, [
    { x: 497, y: 248, hw: 15, z: 0.08 }, { x: 490, y: 268, hw: 13, z: 0.12 },
    { x: 480, y: 290, hw: 12, z: 0.17 }, { x: 472, y: 302, hw: 5, z: 0.21 },
  ], { segments: 10 });
  model.eyes(rig.head, [[478, 228], [526, 226]], 0.083, 0.007, eyeMaterial);

  // Wings, cut from the art, on the bones the animator flaps
  rig.leftWing = new THREE.Group();
  rig.rightWing = new THREE.Group();
  rig.leftWing.position.set(0.15, 0.2, -0.13);
  rig.rightWing.position.set(-0.15, 0.2, -0.13);
  rig.chest.add(rig.leftWing, rig.rightWing);
  model.panel(rig.leftWing, [[640, 180], [1015, 180], [1015, 935], [640, 935]], { z: -0.14, bend: 0.14, material: 'cloth', columns: 8, rows: 8 });
  model.panel(rig.rightWing, [[15, 150], [395, 150], [395, 860], [15, 860]], { z: -0.14, bend: 0.14, material: 'cloth', columns: 8, rows: 8 });

  // Arms
  model.tube(rig.leftUpperArm, [{ x: 672, y: 400, hw: 62 }, { x: 702, y: 500, hw: 66 }, { x: 728, y: 595, hw: 56 }]);
  model.tube(rig.leftLowerArm, [{ x: 728, y: 585, hw: 52 }, { x: 742, y: 660, hw: 44 }, { x: 742, y: 790, hw: 38 }]);
  model.tube(rig.leftHand, [{ x: 735, y: 770, hw: 30 }, { x: 732, y: 830, hw: 42 }, { x: 728, y: 870, hw: 30 }, { x: 718, y: 892, hw: 12 }], { depth: 0.5 });
  model.tube(rig.rightUpperArm, [{ x: 355, y: 410, hw: 55 }, { x: 325, y: 505, hw: 58 }, { x: 300, y: 600, hw: 50 }]);
  model.tube(rig.rightLowerArm, [{ x: 305, y: 590, hw: 46 }, { x: 278, y: 680, hw: 38 }, { x: 258, y: 790, hw: 34 }]);
  model.tube(rig.rightHand, [{ x: 262, y: 770, hw: 34 }, { x: 258, y: 805, hw: 38 }, { x: 252, y: 845, hw: 18 }], { depth: 0.8 });

  // The drawn sword, in the hand where the art holds it
  model.tube(rig.weaponSlot, [
    { x: 330, y: 708, hw: 11 }, { x: 278, y: 785, hw: 12 }, { x: 245, y: 832, hw: 12 },
    { x: 240, y: 838, hw: 34, rz: 0.04 }, { x: 226, y: 860, hw: 34, rz: 0.04 }, { x: 222, y: 866, hw: 14 },
  ], { segments: 10 });
  model.tube(rig.weaponSlot, [
    { x: 222, y: 866, hw: 18, rz: 0.007 }, { x: 180, y: 945, hw: 19, rz: 0.007 }, { x: 118, y: 1062, hw: 18, rz: 0.007 },
    { x: 62, y: 1150, hw: 14, rz: 0.006 }, { x: 28, y: 1193, hw: 1.5, rz: 0.002 },
  ], { segments: 6 });

  // Legs
  model.tube(rig.leftUpperLeg, [{ x: 590, y: 900, hw: 100 }, { x: 605, y: 1040, hw: 100 }, { x: 628, y: 1120, hw: 62 }]);
  model.tube(rig.leftLowerLeg, [
    { x: 630, y: 1115, hw: 58 }, { x: 640, y: 1200, hw: 56 }, { x: 652, y: 1300, hw: 36 }, { x: 656, y: 1400, hw: 36 },
  ]);
  model.tube(rig.rightUpperLeg, [{ x: 415, y: 900, hw: 100 }, { x: 402, y: 1040, hw: 94 }, { x: 395, y: 1115, hw: 58 }]);
  model.tube(rig.rightLowerLeg, [
    { x: 395, y: 1110, hw: 54 }, { x: 392, y: 1200, hw: 52 }, { x: 382, y: 1300, hw: 34 }, { x: 385, y: 1385, hw: 36 },
  ]);
  const tenguFoot = { x: 662, top: 1385, bottom: 1476, hw: 50 };
  model.foot(rig.leftFoot, tenguFoot);
  model.foot(rig.rightFoot, tenguFoot);

  return finishRig(model, rig, 1.12);
}

// ─── Crimson Oni ─────────────────────────────────────────────────────────────

const ONI_SHEET = sheet('/assets/boss/crimson-oni/oni', 510, 1470, 670, 1.45);

const ONI_JOINTS: ArtJoints = {
  pelvisY: 1.0,
  spineRise: 0.15,
  neck: [512, 400], head: [512, 375],
  leftShoulder: [735, 450], leftElbow: [850, 660], leftHand: [825, 880],
  rightShoulder: [290, 470], rightElbow: [270, 640], rightHand: [165, 720],
  leftHip: [630, 830], leftKnee: [710, 1130], leftFoot: [750, 1400],
  rightHip: [390, 830], rightKnee: [365, 1130], rightFoot: [350, 1395],
};

export interface OniModel {
  rig: CharacterRig;
  body: THREE.MeshStandardMaterial;
  eyes: THREE.MeshStandardMaterial;
  core: THREE.MeshStandardMaterial;
}

export function buildCrimsonOni(): OniModel {
  const rig = new CharacterRig();
  poseFromArt(rig, ONI_SHEET, ONI_JOINTS);
  const model = new ReferenceModel(rig.root, ONI_SHEET);
  const eyes = glowing(0xff7a10, 3);
  const core = new THREE.MeshStandardMaterial({
    color: 0xff1100, emissive: 0xff1100, emissiveIntensity: 1.5, transparent: true, opacity: 0.55,
  });

  model.tube(rig.chest, [
    { x: 512, y: 345, hw: 105 }, { x: 505, y: 420, hw: 218 }, { x: 500, y: 505, hw: 226 }, { x: 500, y: 595, hw: 188 },
  ], { depth: 0.62, z: 0.02 });
  model.tube(rig.spine, [
    { x: 500, y: 570, hw: 190 }, { x: 505, y: 640, hw: 178 }, { x: 510, y: 725, hw: 178 },
  ], { depth: 0.72, z: 0.02 });
  model.tube(rig.pelvis, [
    { x: 505, y: 705, hw: 182 }, { x: 500, y: 800, hw: 190 }, { x: 505, y: 960, hw: 200 },
  ], { depth: 0.68 });

  // The armoured apron and torn skirt, front and back
  const skirt: [number, number][] = [[290, 790], [735, 790], [890, 1380], [268, 1380]];
  model.panel(rig.pelvis, skirt, { z: 0.205, bend: 0.22, lean: 0.03, material: 'cloth', columns: 8, rows: 8 });
  model.panel(rig.pelvis, skirt, { z: -0.2, bend: -0.22, lean: -0.03, material: 'cloth', columns: 8, rows: 8 });

  // Head, horns, wild hair
  model.tube(rig.head, [
    { x: 515, y: 205, hw: 46 }, { x: 510, y: 250, hw: 64 }, { x: 510, y: 320, hw: 66 }, { x: 515, y: 392, hw: 44 },
  ], { depth: 0.95, z: 0.05, back: { x: 530, y: 150, hw: 34, hh: 22 } });
  model.panel(rig.head, [[345, 105], [705, 105], [705, 375], [345, 375]], { z: -0.05, material: 'cloth', columns: 5, rows: 5 });
  model.tube(rig.head, [
    { x: 415, y: 64, hw: 1.5 }, { x: 385, y: 120, hw: 13 }, { x: 396, y: 175, hw: 22 }, { x: 440, y: 205, hw: 22 }, { x: 472, y: 225, hw: 16 },
  ], { segments: 8, z: 0.025 });
  model.tube(rig.head, [
    { x: 560, y: 36, hw: 1.5 }, { x: 606, y: 90, hw: 12 }, { x: 600, y: 150, hw: 22 }, { x: 566, y: 190, hw: 24 }, { x: 535, y: 208, hw: 16 },
  ], { segments: 8, z: 0.025 });
  model.eyes(rig.head, [[487, 262], [535, 260]], 0.142, 0.01, eyes);

  // The chest medallion's inner glow, which brightens with each phase
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), core);
  glow.scale.z = 0.4;
  const chestOrigin = rig.chest.getWorldPosition(new THREE.Vector3());
  glow.position.set(-40 / 670 - chestOrigin.x, (1470 - 472) / 670 - chestOrigin.y, 0.14);
  rig.chest.add(glow);

  // The armoured arm: spiked pauldron and bracer, with their silhouettes from the art
  model.tube(rig.leftUpperArm, [{ x: 720, y: 440, hw: 100 }, { x: 790, y: 560, hw: 102 }, { x: 850, y: 655, hw: 88 }]);
  model.tube(rig.leftUpperArm, [
    { x: 680, y: 285, hw: 50 }, { x: 750, y: 340, hw: 128 }, { x: 792, y: 440, hw: 128 }, { x: 830, y: 505, hw: 80 },
  ], { depth: 0.55, z: 0.02 });
  model.panel(rig.leftUpperArm, [[605, 215], [935, 215], [935, 545], [605, 545]], { z: 0.02, material: 'cloth', columns: 4, rows: 4 });
  model.tube(rig.leftLowerArm, [{ x: 850, y: 640, hw: 92 }, { x: 860, y: 720, hw: 102 }, { x: 860, y: 870, hw: 76 }]);
  model.panel(rig.leftLowerArm, [[745, 540], [990, 540], [990, 905], [745, 905]], { z: 0.01, material: 'cloth', columns: 4, rows: 4 });
  model.tube(rig.leftHand, [{ x: 820, y: 860, hw: 68 }, { x: 838, y: 930, hw: 82 }, { x: 825, y: 1000, hw: 46 }], { depth: 0.6 });

  // The club arm
  model.tube(rig.rightUpperArm, [{ x: 322, y: 430, hw: 66 }, { x: 288, y: 540, hw: 76 }, { x: 258, y: 625, hw: 72 }]);
  model.tube(rig.rightLowerArm, [{ x: 268, y: 615, hw: 72 }, { x: 245, y: 675, hw: 72 }, { x: 180, y: 735, hw: 62 }]);
  model.tube(rig.rightHand, [{ x: 165, y: 670, hw: 54 }, { x: 165, y: 730, hw: 60 }, { x: 165, y: 800, hw: 48 }], { depth: 0.85 });

  // The spiked club, with its silhouette from the art
  model.tube(rig.weaponSlot, [
    { x: 165, y: 392, hw: 12 }, { x: 165, y: 430, hw: 40 }, { x: 165, y: 480, hw: 26 }, { x: 165, y: 620, hw: 22 },
    { x: 165, y: 860, hw: 26 }, { x: 165, y: 900, hw: 46 }, { x: 165, y: 990, hw: 44 }, { x: 160, y: 1012, hw: 76 },
    { x: 155, y: 1200, hw: 86 }, { x: 150, y: 1400, hw: 88 }, { x: 150, y: 1475, hw: 46 },
  ], { segments: 16, depth: 1 });
  model.panel(rig.weaponSlot, [[35, 975], [275, 975], [275, 1485], [35, 1485]], { z: 0, material: 'cloth', columns: 2, rows: 3 });

  // Legs
  model.tube(rig.leftUpperLeg, [{ x: 640, y: 880, hw: 112 }, { x: 688, y: 1060, hw: 112 }, { x: 710, y: 1150, hw: 100 }]);
  model.tube(rig.leftLowerLeg, [
    { x: 710, y: 1130, hw: 100 }, { x: 716, y: 1250, hw: 90 }, { x: 740, y: 1340, hw: 72 }, { x: 750, y: 1418, hw: 66 },
  ]);
  model.tube(rig.rightUpperLeg, [{ x: 385, y: 900, hw: 106 }, { x: 355, y: 1050, hw: 92 }, { x: 360, y: 1150, hw: 86 }]);
  model.tube(rig.rightLowerLeg, [
    { x: 365, y: 1130, hw: 86 }, { x: 360, y: 1250, hw: 76 }, { x: 345, y: 1340, hw: 75 }, { x: 350, y: 1408, hw: 70 },
  ]);
  const oniFoot = { x: 755, top: 1405, bottom: 1502, hw: 76, height: 0.09 };
  model.foot(rig.leftFoot, oniFoot);
  model.foot(rig.rightFoot, oniFoot);

  const body = model.bodyMaterial;
  finishRig(model, rig, 2.0);
  return { rig, body, eyes, core };
}
