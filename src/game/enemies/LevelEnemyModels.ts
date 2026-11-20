import * as THREE from 'three';
import { CharacterRig } from '../characters/CharacterRig';
import { CharacterFactory } from '../characters/CharacterFactory';
import { Katana } from '../combat/Katana';
import { LevelEnemyModel, PoseInput } from './LevelEnemyTypes';

/**
 * LevelEnemyModels — Procedural models for the yokai of the later levels, each
 * with its own animation. Humanoids are built on the shared CharacterRig; the
 * rest are hand-assembled from pivots.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────

const std = (color: number, options: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options });
const glow = (color: number, intensity: number = 2.4) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });

function add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
  x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function pivot(parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/**
 * One number for "where in the swing": 0 at rest, towards -1 while winding up,
 * sweeping to +1 through the strike, and back to 0 in recovery.
 */
function swing(pose: PoseInput): number {
  if (pose.action !== 'attack' || !pose.stage) return pose.action === 'hold' ? 0.4 : 0;
  if (pose.stage === 'windup') return -easeOut(pose.progress);
  if (pose.stage === 'active') return -1 + 2 * easeOut(pose.progress);
  return 1 - pose.progress;
}

/** The fall, sink and fade shared by every model. */
function deathTilt(root: THREE.Object3D, pose: PoseInput, axis: 'x' | 'z' = 'x', amount = -1.35): void {
  if (pose.action === 'dead') root.rotation[axis] = amount * easeOut(pose.progress);
  else root.rotation[axis] = 0;
}

// ─── Humanoids on the shared rig ────────────────────────────────────────────

type Bone = keyof Pick<CharacterRig,
  'pelvis' | 'spine' | 'chest' | 'neck' | 'head'
  | 'leftUpperArm' | 'leftLowerArm' | 'rightUpperArm' | 'rightLowerArm'
  | 'leftUpperLeg' | 'leftLowerLeg' | 'rightUpperLeg' | 'rightLowerLeg'>;
const BONES: Bone[] = ['pelvis', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'rightUpperArm',
  'rightLowerArm', 'leftUpperLeg', 'leftLowerLeg', 'rightUpperLeg', 'rightLowerLeg'];

/** Poses a rig as offsets from its rest pose, so traced models keep their shape. */
function humanoidAnimator(rig: CharacterRig, style: 'sword' | 'caster') {
  const rest = new Map<Bone, THREE.Euler>();
  for (const bone of BONES) rest.set(bone, rig[bone].rotation.clone());
  const restPelvisY = rig.pelvis.position.y;

  return (pose: PoseInput) => {
    for (const bone of BONES) rig[bone].rotation.copy(rest.get(bone)!);
    rig.pelvis.position.y = restPelvisY;
    const bend = (bone: Bone, x = 0, y = 0, z = 0) => {
      rig[bone].rotation.x += x;
      rig[bone].rotation.y += y;
      rig[bone].rotation.z += z;
    };

    const t = pose.time;
    const s = swing(pose);
    bend('chest', Math.sin(t * 2) * 0.03);

    if (pose.action === 'move') {
      const stride = Math.sin(t * (6 + pose.speed * 1.2));
      const reach = Math.min(1, pose.speed / 4) * 0.6;
      bend('leftUpperLeg', stride * reach);
      bend('rightUpperLeg', -stride * reach);
      bend('leftLowerLeg', Math.max(0, -stride) * reach);
      bend('rightLowerLeg', Math.max(0, stride) * reach);
      bend('leftUpperArm', -stride * reach * 0.5);
      bend('rightUpperArm', stride * reach * 0.5);
      bend('spine', 0.12);
    }

    if (pose.action === 'attack' || pose.action === 'hold') {
      const move = pose.move;
      if (move === 'slam') {
        bend('rightUpperArm', -2.6 * Math.max(0, -s) + 0.4 * Math.max(0, s), 0, 0);
        bend('leftUpperArm', -2.6 * Math.max(0, -s) + 0.4 * Math.max(0, s));
        bend('spine', -0.3 * Math.max(0, -s) + 0.45 * Math.max(0, s));
        rig.pelvis.position.y -= 0.18 * Math.max(0, s);
      } else if (move === 'shoot' || move === 'hazard' || move === 'summon') {
        const raise = pose.stage === 'windup' ? easeOut(pose.progress) : pose.stage === 'active' ? 1 : 1 - pose.progress;
        bend('rightUpperArm', -1.5 * raise, 0, -0.2 * raise);
        bend('rightLowerArm', -0.3 * raise);
        if (move !== 'shoot') bend('leftUpperArm', -1.5 * raise, 0, 0.2 * raise);
        bend('head', -0.2 * raise);
      } else if (move === 'grab') {
        const reach = Math.max(0, s) + (pose.action === 'hold' ? 0.6 : 0);
        bend('rightUpperArm', -1.4 * reach - 0.4 * Math.max(0, -s));
        bend('leftUpperArm', -1.4 * reach - 0.4 * Math.max(0, -s));
        bend('spine', 0.35 * reach);
      } else {
        // A cut: blade drawn up and back over the shoulder, then brought down across
        bend('rightUpperArm', s < 0 ? -2.4 * -s : -2.4 + 2.9 * s, 0, s < 0 ? -0.5 * -s : -0.5 + 0.9 * s);
        bend('rightLowerArm', s < 0 ? -0.6 * -s : -0.6 + 0.6 * s);
        if (style === 'sword') bend('leftUpperArm', s < 0 ? -1.6 * -s : -1.6 + 1.8 * s);
        bend('chest', 0, s < 0 ? 0.55 * -s : 0.55 - 1.2 * s);
        bend('spine', s > 0 ? 0.25 * s : 0);
        bend('leftUpperLeg', -0.4 * Math.abs(s));
        bend('rightUpperLeg', 0.3 * Math.abs(s));
      }
    }

    if (pose.action === 'hurt') {
      const recoil = 1 - pose.progress;
      bend('spine', -0.4 * recoil);
      bend('head', -0.3 * recoil);
      bend('leftUpperArm', 0, 0, 0.4 * recoil);
      bend('rightUpperArm', 0, 0, -0.4 * recoil);
    }

    if (pose.action === 'roar') {
      bend('leftUpperArm', 0, 0, 1.3);
      bend('rightUpperArm', 0, 0, -1.3);
      bend('head', -0.5);
      bend('chest', -0.25);
    }

    deathTilt(rig.root, pose);
  };
}

/** A Ronin-shaped swordsman: the Fallen Samurai, or Akane. */
function swordsman(tint: number, eyeColor: number, scale: number, armored: boolean): LevelEnemyModel {
  const { rig, sheathedHilt, ponytail } = CharacterFactory.createRonin();
  const copies = new Map<THREE.Material, THREE.Material>();
  const tintColor = new THREE.Color(tint);
  rig.root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    let copy = copies.get(mesh.material);
    if (!copy) {
      copy = mesh.material.clone();
      const standard = copy as THREE.MeshStandardMaterial;
      if (standard.color) standard.color.multiply(tintColor);
      copies.set(mesh.material, copy);
    }
    mesh.material = copy;
  });
  sheathedHilt.visible = false;

  const katana = new Katana();
  katana.attachTo(rig.weaponSlot);

  if (armored) {
    // Lacquered plates over the shoulders, a horned helm, and fire in the eyes
    ponytail.visible = false;
    const lacquer = std(0x1a0d0d, { roughness: 0.35, metalness: 0.5 });
    const gold = std(0xb08a3a, { roughness: 0.3, metalness: 0.9 });
    for (const side of [1, -1]) {
      const arm = side > 0 ? rig.leftUpperArm : rig.rightUpperArm;
      const plate = add(arm, new THREE.BoxGeometry(0.26, 0.05, 0.3), lacquer, 0.04 * side, 0.02, 0, 0, 0, -0.35 * side);
      add(plate, new THREE.BoxGeometry(0.27, 0.02, 0.31), gold, 0, -0.035, 0);
    }
    const helm = add(rig.head, new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), lacquer, 0, 0.13, -0.01);
    helm.scale.set(1.05, 0.9, 1.1);
    add(rig.head, new THREE.CylinderGeometry(0.24, 0.26, 0.03, 16), lacquer, 0, 0.11, 0);
    for (const side of [1, -1]) {
      const horn = add(rig.head, new THREE.ConeGeometry(0.025, 0.32, 6), gold, 0.08 * side, 0.3, 0.1, -0.5, 0, -0.55 * side);
      horn.scale.z = 0.4;
    }
    const mask = add(rig.head, new THREE.BoxGeometry(0.17, 0.08, 0.04), std(0x5a1010, { roughness: 0.4 }), 0, 0.02, 0.15);
    mask.rotation.x = 0.1;
  }
  const eyes = glow(eyeColor, 3.2);
  for (const side of [1, -1]) add(rig.head, new THREE.SphereGeometry(0.018, 6, 6), eyes, 0.05 * side, 0.09, 0.16);

  rig.root.scale.multiplyScalar(scale);
  const animate = humanoidAnimator(rig, 'sword');
  return { root: rig.root, animate };
}

export function buildFallenSamurai(): LevelEnemyModel {
  return swordsman(0x4a3a40, 0xff4a20, 1.18, true);
}

export function buildAkaneRival(): LevelEnemyModel {
  return swordsman(0xb0605a, 0xffb080, 0.98, false);
}

/** A possessed monk: patched robe, straw hat, prayer beads, fire in an open hand. */
export function buildPossessedMonk(): LevelEnemyModel {
  const rig = new CharacterRig();
  const robe = std(0x6a3a1a, { roughness: 0.95 });
  const inner = std(0x2a1a14, { roughness: 0.95 });
  const skin = std(0x6a5a52, { roughness: 0.8 });
  const straw = std(0x9a8050, { roughness: 1, flatShading: true });
  const bead = std(0x3a2418, { roughness: 0.5 });
  const fire = glow(0xff8a2a, 3);

  const skirt = new THREE.CylinderGeometry(0.2, 0.5, 1.05, 10);
  skirt.translate(0, -0.55, 0);
  add(rig.pelvis, skirt, robe);
  add(rig.spine, new THREE.BoxGeometry(0.38, 0.32, 0.26), robe, 0, 0.12);
  add(rig.chest, new THREE.BoxGeometry(0.46, 0.38, 0.3), robe, 0, 0.14);
  add(rig.chest, new THREE.BoxGeometry(0.2, 0.36, 0.02), inner, 0, 0.13, 0.155);
  // Beads across the chest
  for (let i = 0; i < 9; i++) {
    const a = -0.9 + i * 0.22;
    add(rig.chest, new THREE.SphereGeometry(0.035, 6, 6), bead, Math.sin(a) * 0.22, 0.2 - Math.cos(a) * 0.12, 0.17);
  }
  add(rig.head, new THREE.SphereGeometry(0.13, 10, 8), skin, 0, 0.1, 0);
  const hat = add(rig.head, new THREE.ConeGeometry(0.42, 0.24, 14), straw, 0, 0.22, 0);
  hat.rotation.x = 0.12;
  for (const side of [1, -1]) add(rig.head, new THREE.SphereGeometry(0.02, 6, 6), glow(0xffa040, 3), 0.045 * side, 0.1, 0.12);

  for (const [upper, lower, hand] of [[rig.leftUpperArm, rig.leftLowerArm, rig.leftHand], [rig.rightUpperArm, rig.rightLowerArm, rig.rightHand]]) {
    const sleeve = new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8);
    sleeve.translate(0, -0.14, 0);
    add(upper, sleeve, robe);
    const fore = new THREE.CylinderGeometry(0.11, 0.14, 0.26, 8);
    fore.translate(0, -0.12, 0);
    add(lower, fore, robe);
    add(hand, new THREE.SphereGeometry(0.055, 8, 6), skin, 0, -0.02, 0);
  }
  const flame = add(rig.rightHand, new THREE.IcosahedronGeometry(0.1, 0), fire, 0, -0.1, 0.06);
  for (const leg of [rig.leftUpperLeg, rig.rightUpperLeg]) {
    const shin = new THREE.CylinderGeometry(0.07, 0.06, 0.8, 6);
    shin.translate(0, -0.4, 0);
    add(leg, shin, inner);
  }

  const animate = humanoidAnimator(rig, 'caster');
  return {
    root: rig.root,
    animate: pose => {
      animate(pose);
      const flare = pose.action === 'attack' && pose.stage === 'windup' ? 1 + pose.progress * 1.4 : 1;
      flame.scale.setScalar(flare * (1 + Math.sin(pose.time * 14) * 0.15));
      flame.rotation.y = pose.time * 3;
    },
  };
}

// ─── Kappa ────────────────────────────────────────────────────────────────

/** A river kappa: squat, shelled, beaked, with a dish of water on its head. */
export function buildKappa(): LevelEnemyModel {
  const root = new THREE.Group();
  const skin = std(0x4a6a3a, { roughness: 0.6, flatShading: true });
  const belly = std(0x9aa86a, { roughness: 0.7, flatShading: true });
  const shell = std(0x2a3a22, { roughness: 0.5, flatShading: true });
  const rim = std(0x6a5a2a, { roughness: 0.6 });
  const beak = std(0xc8a040, { roughness: 0.5 });
  const water = new THREE.MeshStandardMaterial({ color: 0x8ac8e8, emissive: 0x2a6a8a, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.2 });
  const eye = glow(0xfff06a, 2.6);
  const hair = std(0x1a2414, { roughness: 1 });

  const hips = pivot(root, 0, 0.62, 0);
  const body = pivot(hips, 0, 0, 0);
  const torso = add(body, new THREE.SphereGeometry(0.46, 12, 10), skin, 0, 0.32, 0);
  torso.scale.set(1, 1.05, 0.85);
  add(body, new THREE.SphereGeometry(0.36, 10, 8), belly, 0, 0.28, 0.16).scale.set(1, 1.1, 0.6);
  const back = add(body, new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), shell, 0, 0.36, -0.12, -Math.PI / 2 - 0.15, 0, 0);
  back.scale.set(1, 0.6, 1.1);
  add(body, new THREE.TorusGeometry(0.5, 0.04, 6, 18), rim, 0, 0.36, -0.14, 0.15, 0, 0);
  // Ridges on the shell
  for (let i = -1; i <= 1; i++) add(body, new THREE.BoxGeometry(0.08, 0.5, 0.06), rim, i * 0.2, 0.38, -0.42, 0.15, 0, 0);

  const head = pivot(body, 0, 0.82, 0.08);
  add(head, new THREE.SphereGeometry(0.27, 12, 10), skin, 0, 0.06, 0).scale.set(1, 0.9, 1);
  add(head, new THREE.ConeGeometry(0.11, 0.26, 6), beak, 0, -0.02, 0.3, Math.PI / 2, 0, 0).scale.set(1.3, 1, 0.6);
  add(head, new THREE.CylinderGeometry(0.17, 0.15, 0.05, 14), rim, 0, 0.27, -0.02);
  add(head, new THREE.CylinderGeometry(0.14, 0.14, 0.02, 14), water, 0, 0.3, -0.02);
  for (const side of [1, -1]) add(head, new THREE.SphereGeometry(0.045, 8, 6), eye, 0.11 * side, 0.1, 0.22);
  // A ragged fringe around the dish
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(head, new THREE.ConeGeometry(0.04, 0.18, 4), hair, Math.sin(a) * 0.2, 0.2, Math.cos(a) * 0.2 - 0.02, Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9);
  }

  const arms = [1, -1].map(side => {
    const shoulder = pivot(body, 0.42 * side, 0.52, 0.05);
    const upper = new THREE.CylinderGeometry(0.07, 0.09, 0.5, 6);
    upper.translate(0, -0.25, 0);
    add(shoulder, upper, skin);
    const elbow = pivot(shoulder, 0, -0.48, 0);
    const fore = new THREE.CylinderGeometry(0.06, 0.07, 0.48, 6);
    fore.translate(0, -0.24, 0);
    add(elbow, fore, skin);
    // Webbed, clawed hand
    for (let f = -1; f <= 1; f++) add(elbow, new THREE.ConeGeometry(0.035, 0.2, 4), beak, f * 0.05, -0.56, 0.03, 0.2, 0, f * 0.25);
    add(elbow, new THREE.CircleGeometry(0.1, 6), std(0x3a5a2a, { side: THREE.DoubleSide }), 0, -0.5, 0.02);
    return { shoulder, elbow, side };
  });
  const legs = [1, -1].map(side => {
    const hip = pivot(hips, 0.2 * side, 0, 0);
    const thigh = new THREE.CylinderGeometry(0.1, 0.08, 0.36, 6);
    thigh.translate(0, -0.18, 0);
    add(hip, thigh, skin);
    const knee = pivot(hip, 0, -0.34, 0);
    const shin = new THREE.CylinderGeometry(0.07, 0.06, 0.28, 6);
    shin.translate(0, -0.14, 0);
    add(knee, shin, skin);
    add(knee, new THREE.BoxGeometry(0.16, 0.04, 0.24), skin, 0, -0.3, 0.06);
    return { hip, knee, side };
  });

  return {
    root,
    animate: pose => {
      const t = pose.time;
      const s = swing(pose);
      const bob = pose.action === 'move' ? Math.abs(Math.sin(t * 9)) * 0.08 : Math.sin(t * 2) * 0.02;
      hips.position.y = 0.62 + bob;
      body.rotation.x = pose.action === 'move' ? 0.25 : 0.1;
      head.rotation.set(Math.sin(t * 1.3) * 0.08, Math.sin(t * 0.9) * 0.2, 0);

      for (const { shoulder, elbow, side } of arms) {
        shoulder.rotation.set(0, 0, 0.25 * side);
        elbow.rotation.set(-0.3, 0, 0);
        if (pose.action === 'move') shoulder.rotation.x = Math.sin(t * 9 + (side > 0 ? 0 : Math.PI)) * 0.5;
      }
      for (const { hip, knee, side } of legs) {
        const stride = pose.action === 'move' ? Math.sin(t * 9 + (side > 0 ? 0 : Math.PI)) * 0.6 : 0;
        hip.rotation.x = -0.5 + stride;
        knee.rotation.x = 0.7 + Math.max(0, -stride);
      }

      if (pose.action === 'attack' || pose.action === 'hold') {
        const reach = pose.action === 'hold' ? 1 : Math.max(0, s);
        const pull = Math.max(0, -s);
        for (const { shoulder, elbow, side } of arms) {
          shoulder.rotation.x = -1.6 * reach + 0.6 * pull;
          shoulder.rotation.z = (0.25 - 0.15 * reach) * side;
          elbow.rotation.x = -0.1 - 0.5 * pull;
        }
        body.rotation.x = 0.1 + 0.5 * reach - 0.2 * pull;
        if (pose.move === 'slam') hips.position.y -= 0.2 * reach;
      }
      if (pose.action === 'hurt') body.rotation.x = -0.4 * (1 - pose.progress);
      if (pose.action === 'roar') head.rotation.x = -0.6;
      deathTilt(root, pose, 'z', 1.5);
    },
  };
}

// ─── Kamaitachi ───────────────────────────────────────────────────────────

/** A wind weasel, low and quick, with sickles where its forepaws should be. */
export function buildKamaitachi(): LevelEnemyModel {
  const root = new THREE.Group();
  const fur = std(0x8a7a5a, { roughness: 0.9, flatShading: true });
  const dark = std(0x4a3a2a, { roughness: 0.9, flatShading: true });
  const blade = std(0xd8e0e8, { roughness: 0.15, metalness: 0.95 });
  const eye = glow(0x8af0ff, 3);
  const wind = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });

  const body = pivot(root, 0, 0.55, 0);
  add(body, new THREE.CapsuleGeometry(0.2, 0.75, 4, 10), fur, 0, 0, 0, Math.PI / 2, 0, 0);
  add(body, new THREE.CapsuleGeometry(0.15, 0.5, 4, 8), std(0xd8c8a0, { roughness: 0.9 }), 0, -0.06, 0.05, Math.PI / 2, 0, 0);
  const head = pivot(body, 0, 0.12, 0.55);
  add(head, new THREE.SphereGeometry(0.17, 10, 8), fur, 0, 0, 0).scale.set(0.9, 0.8, 1.2);
  add(head, new THREE.ConeGeometry(0.08, 0.2, 6), fur, 0, -0.03, 0.2, Math.PI / 2, 0, 0);
  for (const side of [1, -1]) {
    add(head, new THREE.ConeGeometry(0.06, 0.14, 4), dark, 0.09 * side, 0.15, -0.04, -0.3, 0, -0.3 * side);
    add(head, new THREE.SphereGeometry(0.03, 6, 6), eye, 0.08 * side, 0.04, 0.13);
  }

  const forelegs = [1, -1].map(side => {
    const shoulder = pivot(body, 0.13 * side, -0.05, 0.35);
    const leg = new THREE.CylinderGeometry(0.04, 0.035, 0.42, 6);
    leg.translate(0, -0.21, 0);
    add(shoulder, leg, dark);
    // The sickle, curving forward from the wrist
    const sickle = pivot(shoulder, 0, -0.4, 0.02);
    const curve = new THREE.TorusGeometry(0.28, 0.022, 4, 12, Math.PI * 0.75);
    add(sickle, curve, blade, 0, 0.22, 0.08, 0, Math.PI / 2, -Math.PI * 0.35);
    return { shoulder, side };
  });
  const hindlegs = [1, -1].map(side => {
    const hip = pivot(body, 0.13 * side, -0.05, -0.38);
    const leg = new THREE.CylinderGeometry(0.06, 0.035, 0.45, 6);
    leg.translate(0, -0.22, 0);
    add(hip, leg, dark);
    return { hip, side };
  });

  // A long tail, and a whirl of wind that thickens when it strikes
  const tail: THREE.Group[] = [];
  let parent: THREE.Object3D = body;
  for (let i = 0; i < 5; i++) {
    const segment = pivot(parent, 0, i === 0 ? 0.05 : 0, i === 0 ? -0.5 : -0.2);
    add(segment, new THREE.SphereGeometry(0.11 - i * 0.012, 8, 6), fur, 0, 0, -0.1);
    tail.push(segment);
    parent = segment;
  }
  const gust = add(root, new THREE.TorusGeometry(0.75, 0.08, 4, 20), wind, 0, 0.5, 0, Math.PI / 2, 0, 0);
  gust.castShadow = false;
  // Bigger than a real weasel, so it reads at a distance
  root.scale.setScalar(1.35);

  return {
    root,
    animate: pose => {
      const t = pose.time;
      const s = swing(pose);
      const gallop = pose.action === 'move' ? Math.sin(t * 16) : 0;
      body.position.y = 0.55 + Math.abs(gallop) * 0.1;
      body.rotation.x = gallop * 0.12;
      head.rotation.y = Math.sin(t * 1.7) * 0.25;
      for (const { shoulder, side } of forelegs) shoulder.rotation.set(gallop * 0.8, 0, 0.05 * side);
      for (const { hip, side } of hindlegs) hip.rotation.set(-gallop * 0.8, 0, 0.05 * side);
      tail.forEach((segment, i) => {
        segment.rotation.y = Math.sin(t * 5 - i * 0.6) * 0.3;
        segment.rotation.x = 0.15 + Math.sin(t * 3 - i) * 0.1;
      });

      let whirl = 0.12;
      if (pose.action === 'attack') {
        // Rears up, then lashes both sickles through
        body.rotation.x = -0.6 * Math.max(0, -s) + 0.3 * Math.max(0, s);
        for (const { shoulder, side } of forelegs) {
          shoulder.rotation.x = -1.8 * Math.max(0, -s) + 1.2 * Math.max(0, s);
          shoulder.rotation.z = 0.3 * side * Math.max(0, s);
        }
        whirl = pose.stage === 'active' ? 0.6 : 0.3;
      }
      if (pose.action === 'hurt') body.rotation.z = Math.sin(t * 30) * 0.15 * (1 - pose.progress);
      (gust.material as THREE.MeshBasicMaterial).opacity = whirl * 0.6 * (pose.action === 'dead' ? 0 : 1);
      gust.rotation.z = t * 12;
      gust.scale.setScalar(1 + Math.sin(t * 7) * 0.1);
      deathTilt(root, pose, 'z', 1.6);
    },
  };
}

// ─── Spiders ──────────────────────────────────────────────────────────────

function spiderLegs(parent: THREE.Object3D, length: number, thickness: number, material: THREE.Material) {
  const legs: { hip: THREE.Group; knee: THREE.Group; side: number; index: number }[] = [];
  for (const side of [1, -1]) {
    for (let i = 0; i < 4; i++) {
      const hip = pivot(parent, 0.18 * side * length, 0, 0.3 * length - i * 0.2 * length);
      hip.rotation.y = side * (0.9 - i * 0.55) + (side > 0 ? 0 : Math.PI);
      const upper = new THREE.CylinderGeometry(thickness, thickness * 0.8, length * 0.75, 5);
      upper.translate(0, length * 0.375, 0);
      const thigh = pivot(hip);
      thigh.rotation.z = -1.0;
      add(thigh, upper, material).rotation.z = 0;
      const knee = pivot(thigh, 0, length * 0.75, 0);
      const lower = new THREE.CylinderGeometry(thickness * 0.8, thickness * 0.3, length, 5);
      lower.translate(0, length * 0.5, 0);
      add(knee, lower, material);
      knee.rotation.z = -2.1;
      legs.push({ hip: thigh, knee, side, index: i });
    }
  }
  return legs;
}

/** A spider the size of a dog, born of the Jorōgumo's web. */
export function buildSpiderling(): LevelEnemyModel {
  const root = new THREE.Group();
  const chitin = std(0x1a1418, { roughness: 0.35, flatShading: true });
  const mark = glow(0xff6a3a, 1.6);
  const body = pivot(root, 0, 0.45, 0);
  add(body, new THREE.SphereGeometry(0.32, 10, 8), chitin, 0, 0.05, -0.32).scale.set(1, 0.85, 1.2);
  add(body, new THREE.SphereGeometry(0.2, 10, 8), chitin, 0, 0, 0.1);
  add(body, new THREE.SphereGeometry(0.08, 6, 6), mark, 0, 0.3, -0.35);
  for (const side of [1, -1]) add(body, new THREE.SphereGeometry(0.035, 6, 6), glow(0xff3020, 3), 0.06 * side, 0.08, 0.27);
  const legs = spiderLegs(body, 0.55, 0.03, chitin);
  return {
    root,
    animate: pose => {
      const t = pose.time;
      const s = swing(pose);
      body.position.y = 0.45 + (pose.action === 'move' ? Math.abs(Math.sin(t * 18)) * 0.04 : 0);
      for (const leg of legs) {
        const phase = (leg.index % 2 === 0 ? 0 : Math.PI) + (leg.side > 0 ? 0 : Math.PI);
        leg.hip.rotation.x = pose.action === 'move' ? Math.sin(t * 18 + phase) * 0.35 : 0;
      }
      body.rotation.x = pose.action === 'attack' ? -0.5 * Math.max(0, -s) + 0.3 * Math.max(0, s) : 0;
      deathTilt(root, pose, 'z', Math.PI);
      if (pose.action === 'dead') root.position.y = 0;
    },
  };
}

/** Half woman, half spider, wrapped in a silk kimono and her own long hair. */
export function buildJorogumo(): LevelEnemyModel {
  const root = new THREE.Group();
  const chitin = std(0x1a1218, { roughness: 0.3, flatShading: true });
  const stripe = std(0xc8a03a, { roughness: 0.4, flatShading: true });
  const skin = std(0xd8ccc8, { roughness: 0.6 });
  const kimono = std(0x5a1a3a, { roughness: 0.7, side: THREE.DoubleSide });
  const obi = std(0xc8a040, { roughness: 0.5 });
  const hair = std(0x0a0808, { roughness: 0.9 });
  const eye = glow(0xff4060, 3.2);
  const silk = new THREE.MeshStandardMaterial({ color: 0xe8e8f0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });

  const body = pivot(root, 0, 1.1, 0);
  // The spider half: abdomen behind, thorax beneath the woman
  const abdomen = add(body, new THREE.SphereGeometry(0.9, 14, 10), chitin, 0, 0.25, -1.1);
  abdomen.scale.set(1, 0.85, 1.25);
  for (let i = 0; i < 3; i++) add(body, new THREE.TorusGeometry(0.7 - i * 0.12, 0.05, 4, 16, Math.PI), stripe, 0, 0.35 + i * 0.1, -0.8 - i * 0.35, -Math.PI / 2 + 0.3, 0, 0);
  add(body, new THREE.SphereGeometry(0.5, 12, 8), chitin, 0, 0.05, 0).scale.set(1, 0.7, 1.1);
  const legs = spiderLegs(body, 1.5, 0.07, chitin);

  // The woman, rising from the thorax
  const waist = pivot(body, 0, 0.35, 0.15);
  const torso = pivot(waist, 0, 0, 0);
  add(torso, new THREE.CylinderGeometry(0.2, 0.3, 0.6, 10), kimono, 0, 0.3, 0);
  add(torso, new THREE.CylinderGeometry(0.31, 0.31, 0.14, 10), obi, 0, 0.08, 0);
  add(torso, new THREE.CylinderGeometry(0.07, 0.08, 0.14, 8), skin, 0, 0.66, 0);
  const head = pivot(torso, 0, 0.82, 0);
  add(head, new THREE.SphereGeometry(0.16, 12, 10), skin, 0, 0, 0).scale.set(0.9, 1.1, 0.95);
  add(head, new THREE.SphereGeometry(0.19, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), hair, 0, 0.04, -0.03);
  for (const side of [1, -1]) {
    add(head, new THREE.SphereGeometry(0.025, 6, 6), eye, 0.055 * side, 0.02, 0.14);
    // Hair falling to the waist
    add(head, new THREE.BoxGeometry(0.1, 0.9, 0.05), hair, 0.13 * side, -0.4, -0.08, 0.1, 0, 0.08 * side);
  }
  add(head, new THREE.BoxGeometry(0.34, 1.0, 0.06), hair, 0, -0.42, -0.14, 0.12, 0, 0);
  add(head, new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4), obi, 0.12, 0.16, -0.05, 0, 0, 0.9);
  const arms = [1, -1].map(side => {
    const shoulder = pivot(torso, 0.27 * side, 0.55, 0);
    const sleeve = new THREE.ConeGeometry(0.2, 0.62, 8, 1, true);
    sleeve.translate(0, -0.3, 0);
    add(shoulder, sleeve, kimono, 0, 0, 0, Math.PI, 0, 0);
    const hand = pivot(shoulder, 0, -0.62, 0);
    add(hand, new THREE.BoxGeometry(0.07, 0.2, 0.04), skin, 0, -0.08, 0);
    for (let f = -1; f <= 1; f++) add(hand, new THREE.ConeGeometry(0.012, 0.14, 4), skin, f * 0.02, -0.24, 0);
    return { shoulder, side };
  });
  // Strands of silk trailing from the spinnerets
  for (let i = 0; i < 3; i++) {
    const strand = add(body, new THREE.PlaneGeometry(0.05, 2.4), silk, (i - 1) * 0.2, 1.3, -1.9, 0.4, 0, 0);
    strand.castShadow = false;
  }
  root.scale.setScalar(1.45);

  return {
    root,
    animate: pose => {
      const t = pose.time;
      const s = swing(pose);
      body.position.y = 1.1 + Math.sin(t * 1.6) * 0.04;
      body.rotation.x = 0;
      torso.rotation.set(Math.sin(t * 1.1) * 0.05, Math.sin(t * 0.7) * 0.15, 0);
      head.rotation.set(0.1, Math.sin(t * 0.6) * 0.25, Math.sin(t * 0.9) * 0.08);
      for (const { shoulder, side } of arms) shoulder.rotation.set(0.2, 0, 0.35 * side + Math.sin(t * 1.4 + side) * 0.05);

      for (const leg of legs) {
        const phase = (leg.index % 2 === 0 ? 0 : Math.PI) + (leg.side > 0 ? 0 : Math.PI);
        const step = pose.action === 'move' ? Math.sin(t * 9 + phase) : 0;
        leg.hip.rotation.x = step * 0.3;
        leg.knee.rotation.z = -2.1 + Math.max(0, step) * 0.3;
      }

      if (pose.action === 'attack') {
        if (pose.move === 'swipe' || pose.move === 'lunge' || pose.move === 'blink') {
          // The two front legs rear up and stab down
          body.rotation.x = -0.35 * Math.max(0, -s) + 0.2 * Math.max(0, s);
          for (const leg of legs) {
            if (leg.index !== 0) continue;
            leg.hip.rotation.x = -1.2 * Math.max(0, -s) + 0.6 * Math.max(0, s);
          }
        } else {
          // Arms raised, weaving silk or calling her brood
          const raise = pose.stage === 'windup' ? easeOut(pose.progress) : pose.stage === 'active' ? 1 : 1 - pose.progress;
          for (const { shoulder, side } of arms) shoulder.rotation.set(-1.4 * raise, 0, (0.35 + 0.5 * raise) * side);
          torso.rotation.x = -0.2 * raise;
        }
      }
      if (pose.action === 'roar') {
        torso.rotation.x = -0.4;
        head.rotation.x = -0.5;
        for (const { shoulder, side } of arms) shoulder.rotation.set(-0.5, 0, 1.4 * side);
      }
      if (pose.action === 'hurt') torso.rotation.x = -0.35 * (1 - pose.progress);
      if (pose.action === 'dead') {
        body.position.y = 1.1 - 0.7 * easeOut(pose.progress);
        torso.rotation.x = 0.9 * easeOut(pose.progress);
        for (const leg of legs) leg.knee.rotation.z = -2.1 - 0.8 * pose.progress;
      }
    },
  };
}

// ─── Umibōzu ──────────────────────────────────────────────────────────────

/** The sea monk: a vast, smooth, dark head rising from the flood, and two arms of black water. */
export function buildUmibozu(): LevelEnemyModel {
  const root = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.15, metalness: 0.3 });
  const eye = glow(0xd8f4ff, 3.6);
  const foam = new THREE.MeshStandardMaterial({ color: 0xbfe0f0, transparent: true, opacity: 0.55, roughness: 0.2, depthWrite: false });

  const body = pivot(root, 0, 0, 0);
  const dome = add(body, new THREE.SphereGeometry(2.1, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), skin, 0, 1.0, 0);
  dome.scale.set(1, 1.25, 0.95);
  add(body, new THREE.CylinderGeometry(2.05, 2.3, 1.2, 24), skin, 0, 0.5, 0);
  const eyes = [1, -1].map(side => add(body, new THREE.SphereGeometry(0.22, 12, 10), eye, 0.62 * side, 2.7, 1.62));
  const brow = add(body, new THREE.TorusGeometry(0.5, 0.08, 6, 16, Math.PI), skin, 0, 2.85, 1.55);
  brow.scale.set(2.2, 0.6, 1);
  const ring = add(root, new THREE.TorusGeometry(2.5, 0.25, 6, 32), foam, 0, 0.12, 0, Math.PI / 2, 0, 0);
  ring.castShadow = false;

  const arms = [1, -1].map(side => {
    const shoulder = pivot(body, 2.0 * side, 1.4, 0.4);
    const segments: THREE.Group[] = [];
    let parent: THREE.Object3D = shoulder;
    for (let i = 0; i < 4; i++) {
      const joint = pivot(parent, 0, i === 0 ? 0 : 0.75, 0);
      add(joint, new THREE.SphereGeometry(0.42 - i * 0.05, 10, 8), skin, 0, 0.38, 0).scale.set(1, 1.3, 1);
      segments.push(joint);
      parent = joint;
    }
    const hand = add(parent, new THREE.SphereGeometry(0.5, 10, 8), skin, 0, 0.9, 0);
    hand.scale.set(1.2, 0.7, 1.4);
    return { shoulder, segments, side };
  });

  return {
    root,
    animate: pose => {
      const t = pose.time;
      const s = swing(pose);
      body.position.y = Math.sin(t * 0.8) * 0.12;
      body.rotation.set(Math.sin(t * 0.5) * 0.03, 0, Math.sin(t * 0.6) * 0.03);
      ring.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06);
      ring.rotation.z = t * 0.3;
      for (const e of eyes) e.scale.setScalar(pose.action === 'attack' && pose.stage === 'windup' ? 1 + pose.progress * 0.6 : 1);

      for (const { shoulder, segments, side } of arms) {
        // Arms of water sway outward at rest
        shoulder.rotation.set(0.2, 0, -(0.9 + Math.sin(t * 0.9 + side) * 0.1) * side);
        segments.forEach((joint, i) => {
          joint.rotation.z = (0.18 + Math.sin(t * 1.3 + i * 0.7 + side) * 0.06) * side;
          joint.rotation.x = 0;
        });
        if (pose.action === 'attack') {
          if (pose.move === 'slam') {
            // Both arms rise high, then crash down in front
            const up = Math.max(0, -s);
            const down = Math.max(0, s);
            shoulder.rotation.x = -1.6 * up + 1.3 * down;
            shoulder.rotation.z = -(0.5 - 0.3 * up) * side;
            segments.forEach(joint => { joint.rotation.x = 0.25 * down; });
          } else if (pose.move === 'swipe') {
            // One arm sweeps across
            if (side > 0) {
              shoulder.rotation.x = 1.2;
              shoulder.rotation.y = -1.4 * Math.max(0, -s) + 1.6 * Math.max(0, s);
              shoulder.rotation.z = -0.3;
            }
          } else {
            shoulder.rotation.x = -0.8 * (pose.stage === 'recovery' ? 1 - pose.progress : 1);
          }
        }
        if (pose.action === 'roar') shoulder.rotation.set(-1.4, 0, -1.2 * side);
      }

      if (pose.action === 'hurt') body.rotation.x = -0.15 * (1 - pose.progress);
      if (pose.action === 'dead') body.position.y = -3.5 * easeOut(pose.progress);
    },
  };
}

// ─── The Maw of Yomi ──────────────────────────────────────────────────────

/** What waits behind the gate: an eye in a mass of black flesh, ringed with teeth and tendrils. */
export function buildMawOfYomi(): LevelEnemyModel {
  const root = new THREE.Group();
  const flesh = new THREE.MeshStandardMaterial({ color: 0x14080c, roughness: 0.45, metalness: 0.1, flatShading: true });
  const vein = glow(0xc0102a, 2.2);
  const iris = glow(0xff3a2a, 3.4);
  const sclera = std(0xe0d4c0, { roughness: 0.3, emissive: 0x402018, emissiveIntensity: 0.6 });
  const pupil = std(0x050002, { roughness: 0.2 });
  const tooth = std(0xd8ccb0, { roughness: 0.4 });

  const body = pivot(root, 0, 3.2, 0);
  const mass = add(body, new THREE.IcosahedronGeometry(2.3, 2), flesh, 0, 0, 0);
  mass.scale.set(1.1, 1, 1);
  // Veins of red light across the flesh
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const v = add(body, new THREE.TorusGeometry(2.25, 0.04, 4, 18, Math.PI * 0.5), vein, 0, 0, 0, a, a * 0.7, 0);
    v.castShadow = false;
  }
  const eyeball = pivot(body, 0, 0.2, 1.75);
  add(eyeball, new THREE.SphereGeometry(1.0, 20, 16), sclera, 0, 0, 0);
  const irisMesh = add(eyeball, new THREE.CircleGeometry(0.55, 24), iris, 0, 0, 1.0);
  const pupilMesh = add(eyeball, new THREE.CircleGeometry(0.22, 16), pupil, 0, 0, 1.01);
  pupilMesh.scale.set(0.4, 1, 1);
  irisMesh.castShadow = pupilMesh.castShadow = false;
  // A ring of teeth around the eye, like a mouth that learned to see
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    add(body, new THREE.ConeGeometry(0.13, 0.55, 5), tooth, Math.sin(a) * 1.3, Math.cos(a) * 1.3 + 0.2, 1.85, 0, 0, -a + Math.PI);
  }

  const tendrils = Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * Math.PI * 2;
    const base = pivot(body, Math.sin(a) * 1.9, -1.0 + Math.cos(a) * 0.4, Math.cos(a) * 1.6 - 0.3);
    base.rotation.set(0, a, 0);
    const joints: THREE.Group[] = [];
    let parent: THREE.Object3D = base;
    for (let i = 0; i < 6; i++) {
      const joint = pivot(parent, 0, 0, i === 0 ? 0 : 0.62);
      add(joint, new THREE.SphereGeometry(0.3 - i * 0.04, 8, 6), flesh, 0, 0, 0.3).scale.set(1, 1, 1.6);
      if (i % 2 === 1) add(joint, new THREE.SphereGeometry(0.07, 6, 6), vein, 0, 0.2, 0.3);
      joints.push(joint);
      parent = joint;
    }
    return { base, joints, a };
  });

  return {
    root,
    animate: pose => {
      const t = pose.time;
      const s = swing(pose);
      body.position.y = 3.2 + Math.sin(t * 0.9) * 0.25;
      body.rotation.y = Math.sin(t * 0.3) * 0.08;
      mass.scale.setScalar(1 + Math.sin(t * 2.4) * 0.03);
      const blink = (Math.sin(t * 0.7) > 0.985) ? 0.1 : 1;
      eyeball.scale.set(1, blink, 1);
      irisMesh.scale.setScalar(pose.action === 'attack' && pose.stage === 'windup' ? 1 + pose.progress * 0.4 : 1);

      for (const { base, joints, a } of tendrils) {
        base.rotation.x = 0.6 + Math.sin(t * 1.2 + a * 2) * 0.15;
        joints.forEach((joint, i) => {
          joint.rotation.x = Math.sin(t * 2 + i * 0.8 + a) * 0.18 + 0.12;
          joint.rotation.y = Math.cos(t * 1.4 + i * 0.6 + a) * 0.12;
        });
        if (pose.action === 'attack' || pose.action === 'hold') {
          if (pose.move === 'slam') {
            base.rotation.x = 0.6 - 1.4 * Math.max(0, -s) + 1.2 * Math.max(0, s);
          } else if (pose.move === 'swipe' || pose.move === 'grab') {
            const lash = pose.action === 'hold' ? 1 : Math.max(0, s);
            base.rotation.x = 0.6 + 0.9 * lash - 0.7 * Math.max(0, -s);
            joints.forEach(joint => { joint.rotation.x = -0.05 * lash; });
          } else {
            base.rotation.x = 0.2;
          }
        }
        if (pose.action === 'roar') base.rotation.x = -0.6;
      }
      if (pose.action === 'hurt') body.rotation.x = -0.12 * (1 - pose.progress);
      if (pose.action === 'dead') {
        body.position.y = 3.2 - 3 * easeOut(pose.progress);
        body.rotation.x = 0.5 * pose.progress;
        eyeball.scale.set(1, Math.max(0.05, 1 - pose.progress), 1);
      }
    },
  };
}
