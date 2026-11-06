import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';
import { ClothSheet, ModelSheet, ReferenceModel } from './ReferenceModel';

const RONIN_SHEET: ModelSheet = {
  textures: '/assets/characters/player/ronin',
  imageWidth: 1024,
  imageHeight: 1536,
  centerX: 470,
  groundY: 1480,
  pixelsPerUnit: 703,
  brightness: 1.5,
};

export interface RoninModel {
  rig: CharacterRig;
  cape: ClothSheet;
  ponytail: THREE.Group;
  /** The sword's grip and guard, showing while it's in its scabbard. */
  sheathedHilt: THREE.Group;
}

/** Repeatable randomness, so the hair is the same every time. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function buildHair(model: ReferenceModel, head: THREE.Group, ponytail: THREE.Group): void {
  const random = seededRandom(1187);
  const spread = (amount: number) => (random() * 2 - 1) * amount;
  const tie: [number, number, number] = [-0.005, 0.27, -0.02];

  // The tied-up spray above the crown
  for (let i = 0; i < 22; i++) {
    const dx = spread(0.15);
    model.strand(ponytail, [
      [0, 0, 0],
      [dx * 0.35, 0.07 + random() * 0.05, spread(0.03) - 0.02],
      [dx, 0.08 + random() * 0.07, spread(0.05) - 0.05],
      [dx * 1.35, 0.03 + random() * 0.06, spread(0.06) - 0.09],
    ], 0.008 + random() * 0.008);
  }

  // The long tail, falling down the back and over the shoulder
  for (let i = 0; i < 30; i++) {
    const dx = spread(0.05) + 0.03;
    const length = 0.26 + random() * 0.26;
    model.strand(ponytail, [
      [0, 0, 0],
      [dx * 0.6, 0.05, -0.08],
      [dx * 1.2, -0.12, -0.15 + spread(0.02)],
      [dx * 1.7, -length * 0.65, -0.17 + spread(0.03)],
      [dx * 2.2 + spread(0.03), -length, -0.15 + spread(0.04)],
    ], 0.008 + random() * 0.009, 10);
  }

  // Combed back over the skull to the tie
  for (let i = 0; i < 58; i++) {
    const a = (i / 58) * Math.PI * 2;
    // Leaves the forehead clear; the art already shows the hairline
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 1.15) continue;
    const low = random() * 0.05;
    model.strand(head, [
      tie,
      [Math.sin(a) * 0.06, 0.255, Math.cos(a) * 0.06 - 0.02],
      [Math.sin(a) * 0.1, 0.17, Math.cos(a) * 0.095 - 0.01],
      [Math.sin(a) * 0.108, 0.05 - low, Math.cos(a) * 0.095 - 0.02],
    ], 0.02, 8);
  }

  // Long loose locks at the sides
  for (let i = 0; i < 24; i++) {
    const side = i % 3 === 0 ? -1 : 1;
    const reach = side > 0 ? 0.08 + random() * 0.1 : 0.035 + random() * 0.05;
    const drop = side > 0 ? 0.12 + random() * 0.16 : 0.05 + random() * 0.08;
    model.strand(head, [
      [side * 0.085, 0.19, -0.02 + spread(0.04)],
      [side * (0.105 + reach * 0.3), 0.07, -0.03 + spread(0.03)],
      [side * (0.1 + reach * 0.7), -drop * 0.5, -0.03 + spread(0.04)],
      [side * (0.1 + reach), -drop, -0.04 + spread(0.06)],
    ], 0.007 + random() * 0.007);
  }

  // Forelocks falling beside the eyes
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      model.strand(head, [
        [side * (0.015 + random() * 0.04), 0.205, 0.075],
        [side * (0.055 + random() * 0.025), 0.15, 0.095],
        [side * (0.07 + random() * 0.015), 0.08, 0.098],
        [side * (0.075 + random() * 0.03), 0.0 + spread(0.03), 0.082],
      ], 0.005 + random() * 0.003);
    }
  }
}

export class CharacterFactory {
  public static createRonin(): RoninModel {
    const rig = new CharacterRig();
    const model = new ReferenceModel(rig.root, RONIN_SHEET);

    // ─── Torso ───────────────────────────────────────────────────
    model.tube(rig.chest, [
      { x: 470, y: 315, hw: 88 },
      { x: 472, y: 370, hw: 148 },
      { x: 472, y: 450, hw: 152 },
      { x: 468, y: 530, hw: 126 },
    ], { depth: 0.62, z: 0.01 });

    model.tube(rig.spine, [
      { x: 468, y: 500, hw: 128 },
      { x: 465, y: 575, hw: 132 },
      { x: 462, y: 640, hw: 136 },
      { x: 455, y: 705, hw: 136 },
    ], { depth: 0.66, z: 0.01 });

    model.tube(rig.pelvis, [
      { x: 455, y: 680, hw: 138 },
      { x: 450, y: 760, hw: 150 },
      { x: 450, y: 880, hw: 158 },
    ], { depth: 0.72 });

    // Hanging armour: the centre plates, and the long plate at the hip
    model.panel(rig.pelvis, [[318, 690], [462, 690], [456, 890], [318, 876]], { z: 0.145, bend: 0.03, lean: 0.03 });
    model.panel(rig.pelvis, [[492, 695], [612, 700], [668, 975], [546, 1020]], { z: 0.15, bend: 0.03, lean: 0.05 });
    model.panel(rig.pelvis, [[452, 860], [545, 830], [556, 992], [460, 968]], { z: 0.12, lean: 0.05, rows: 5, columns: 3 });

    // ─── Scarf and head ──────────────────────────────────────────
    model.tube(rig.chest, [
      { x: 470, y: 262, hw: 56 },
      { x: 482, y: 300, hw: 100 },
      { x: 468, y: 350, hw: 84 },
      { x: 448, y: 402, hw: 42 },
    ], { depth: 0.78, z: 0.05, back: { x: 485, y: 345, hw: 40, hh: 18 } });

    model.tube(rig.head, [
      { x: 465, y: 128, hw: 34 },
      { x: 465, y: 150, hw: 62 },
      { x: 463, y: 195, hw: 72 },
      { x: 462, y: 245, hw: 62 },
      { x: 465, y: 292, hw: 50 },
      { x: 466, y: 322, hw: 40 },
    ], { depth: 1.0, back: { x: 468, y: 150, hw: 30, hh: 14 } });

    const ponytail = new THREE.Group();
    ponytail.position.set(-0.005, 0.27, -0.02);
    rig.head.add(ponytail);
    buildHair(model, rig.head, ponytail);

    const hairTie = new THREE.Mesh(
      new THREE.TorusGeometry(0.024, 0.012, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x4a1216, roughness: 0.8 }),
    );
    hairTie.rotation.x = Math.PI / 2;
    ponytail.add(hairTie);

    // ─── Arms ────────────────────────────────────────────────────
    // On the image's right: the armoured shoulder
    model.tube(rig.leftUpperArm, [
      { x: 636, y: 355, hw: 46 },
      { x: 662, y: 480, hw: 62 },
      { x: 690, y: 595, hw: 54 },
    ], { depth: 0.92 });
    model.tube(rig.leftUpperArm, [
      { x: 625, y: 305, hw: 30 },
      { x: 640, y: 345, hw: 62 },
      { x: 665, y: 420, hw: 66 },
      { x: 695, y: 490, hw: 42 },
    ], { depth: 0.5, z: 0.012 });

    model.tube(rig.leftLowerArm, [
      { x: 690, y: 585, hw: 52 },
      { x: 695, y: 625, hw: 44 },
      { x: 692, y: 705, hw: 42 },
      { x: 688, y: 795, hw: 30 },
    ], { depth: 0.92 });

    model.tube(rig.leftHand, [
      { x: 686, y: 770, hw: 30 },
      { x: 682, y: 820, hw: 35 },
      { x: 672, y: 855, hw: 30 },
      { x: 665, y: 878, hw: 14 },
    ], { depth: 0.52 });

    // On the image's left: robed, with a small plate at the shoulder
    model.tube(rig.rightUpperArm, [
      { x: 330, y: 355, hw: 40 },
      { x: 298, y: 480, hw: 52 },
      { x: 272, y: 595, hw: 46 },
    ], { depth: 0.92 });

    model.tube(rig.rightLowerArm, [
      { x: 272, y: 585, hw: 44 },
      { x: 270, y: 625, hw: 33 },
      { x: 262, y: 705, hw: 32 },
      { x: 250, y: 795, hw: 26 },
    ], { depth: 0.92 });

    model.tube(rig.rightHand, [
      { x: 252, y: 770, hw: 27 },
      { x: 254, y: 815, hw: 29 },
      { x: 262, y: 845, hw: 24 },
      { x: 268, y: 860, hw: 12 },
    ], { depth: 0.52 });

    // ─── Legs ────────────────────────────────────────────────────
    model.tube(rig.leftUpperLeg, [
      { x: 548, y: 860, hw: 86 },
      { x: 568, y: 1000, hw: 100 },
      { x: 584, y: 1090, hw: 84 },
      { x: 592, y: 1140, hw: 48 },
    ]);
    model.tube(rig.rightUpperLeg, [
      { x: 392, y: 860, hw: 86 },
      { x: 385, y: 1000, hw: 88 },
      { x: 385, y: 1085, hw: 78 },
      { x: 385, y: 1125, hw: 48 },
    ]);

    model.tube(rig.leftLowerLeg, [
      { x: 598, y: 1120, hw: 54 },
      { x: 600, y: 1200, hw: 50 },
      { x: 616, y: 1300, hw: 37 },
      { x: 620, y: 1360, hw: 38 },
      { x: 620, y: 1440, hw: 36 },
    ]);
    model.tube(rig.rightLowerLeg, [
      { x: 385, y: 1115, hw: 52 },
      { x: 385, y: 1200, hw: 48 },
      { x: 376, y: 1300, hw: 36 },
      { x: 375, y: 1355, hw: 38 },
      { x: 372, y: 1440, hw: 36 },
    ]);

    // Sandalled feet, both taken from the foot facing the viewer
    const footRings = [
      { x: 620, y: 1392, hw: 30, z: -0.09, rz: 0.05 },
      { x: 620, y: 1405, hw: 36, z: -0.02, rz: 0.075 },
      { x: 620, y: 1430, hw: 44, z: 0.07, rz: 0.055 },
      { x: 620, y: 1462, hw: 46, z: 0.16, rz: 0.04 },
      { x: 620, y: 1484, hw: 34, z: 0.22, rz: 0.022 },
    ];
    model.tube(rig.leftFoot, footRings, { forward: { groundY: -0.05 } });
    model.tube(rig.rightFoot, footRings, { forward: { groundY: -0.05 } });

    // ─── Cape ────────────────────────────────────────────────────
    // Torn cloth, cut from the art's hem, so the tears are the real ones
    const cape = model.cloth(
      rig.chest, 12, 16, 0.24,
      (u, t) => [
        0.05 + u * (0.34 + 0.12 * t),
        0.17 - 1.24 * t,
        -0.15 - 0.15 * t + u * u * 0.13,
      ],
      (u, t) => [745 + Math.abs(u) * 110, 820 + t * 405],
    );

    // The flap off the shoulder, and the strip hanging behind the far leg
    model.panel(rig.chest, [[722, 488], [850, 560], [846, 736], [730, 730]], { z: -0.05, material: 'cloth', columns: 5, rows: 6 });
    model.panel(rig.pelvis, [[250, 880], [302, 860], [296, 1050], [228, 1205]], { z: -0.05, bend: 0.03, material: 'cloth', columns: 3, rows: 8 });

    // ─── Scabbarded sword ────────────────────────────────────────
    rig.sheathSlot.position.set(0, 0, 0);
    rig.sheathSlot.rotation.set(0, 0, 0);
    const sheathedHilt = new THREE.Group();
    rig.pelvis.add(sheathedHilt);

    // The sword is sampled from a straightened strip stored in a corner of the texture
    const along = (s: number, hw: number, z: number) => ({
      x: 418 + (237 * s) / 343,
      y: 522 + (248 * s) / 343,
      hw,
      z,
      rz: (hw / 703) * 0.92,
      ux: 930,
      uy: Math.min(60 + s, 402),
      uhw: Math.min(hw, 38),
    });
    model.tube(sheathedHilt, [
      along(0, 15, 0.215), along(12, 16, 0.213), along(16, 12, 0.212),
      along(130, 14, 0.2), along(150, 16, 0.197), along(153, 38, 0.196),
      along(172, 38, 0.193), along(175, 20, 0.192),
    ], { segments: 14 });
    model.tube(rig.sheathSlot, [
      along(175, 20, 0.192), along(260, 18, 0.165), along(343, 17, 0.12),
      { ...along(343, 15, 0.03), x: 700, y: 840 }, { ...along(343, 10, -0.02), x: 735, y: 905 },
    ], { segments: 14 });

    model.finish();
    return { rig, cape, ponytail, sheathedHilt };
  }
}
