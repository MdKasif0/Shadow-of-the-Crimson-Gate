import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';
import { LevelBuilder, std } from './LevelKit';
import { LevelRuntime, Rect } from './LevelTypes';
import { createMotes, createWindStreaks } from './LevelEffects';
import { SecretDef } from '../world/WorldSecrets';
import { EncounterConfig } from '../encounters/EncounterConfig';

const at = (x: number, z: number) => new THREE.Vector3(x, 0, z);
const rect = (minX: number, maxX: number, minZ: number, maxZ: number): Rect => ({ minX, maxX, minZ, maxZ });

const EDGE = 16;
/** Terraces climbing to the gate: [north edge, south edge, height]. */
const TERRACES: [number, number, number][] = [
  [28, 2, 0.8],
  [0, -26, 1.6],
  [-28, -50, 2.4],
  [-52, -100, 3.2],
];

const SECRETS: SecretDef[] = [
  {
    id: 'gate_scroll', kind: 'scroll', x: -13.5, z: 22, y: 0.8,
    scroll: [
      { id: 'gs_0', speaker: 'Carved into the Gate Stone', text: 'This gate does not lead anywhere. It holds something in. The Oni was its lock, and the heart was the lock’s key.', next: 'gs_1' },
      { id: 'gs_1', speaker: 'Carved into the Gate Stone', text: 'Whoever breaks the lock must finish what the abbots began: close the Maw, or take its place.' },
    ],
  },
  { id: 'gate_charm', kind: 'charm', charmId: 'yomi_pearl', x: 13.5, z: -22, y: 1.6 },
];

const ENCOUNTERS: EncounterConfig[] = [
  {
    id: 'enc_gate_1', center: at(0, 15), activationRadius: 10, leashRadius: 20, reward: 60,
    waves: [
      { enemies: [{ type: 'KAPPA', offset: at(-5, -3) }, { type: 'KAMAITACHI', offset: at(5, -4) }, { type: 'KAMAITACHI', offset: at(0, -6) }], delayAfterComplete: 1.2 },
      { enemies: [{ type: 'SHADOW_YOKAI', offset: at(-6, -6) }, { type: 'SHADOW_YOKAI', offset: at(6, -6) }, { type: 'TENGU', offset: at(0, -9) }], delayAfterComplete: 0 },
    ],
  },
  {
    id: 'enc_gate_2', center: at(0, -13), activationRadius: 10, leashRadius: 20, reward: 80,
    waves: [
      { enemies: [{ type: 'POSSESSED_MONK', offset: at(-6, -6) }, { type: 'POSSESSED_MONK', offset: at(6, -6) }, { type: 'SHIELDED_YOKAI', offset: at(0, -3) }, { type: 'SHADOW_CALLER', offset: at(0, -9) }], delayAfterComplete: 1.5 },
      { enemies: [{ type: 'BASIC_YOKAI', offset: at(0, -6), eliteName: 'The Warden Reborn' }, { type: 'KAPPA', offset: at(-5, -4) }], delayAfterComplete: 0 },
    ],
  },
  {
    id: 'enc_gate_3', center: at(0, -40), activationRadius: 9, leashRadius: 18, reward: 60, unlessFlag: 'akaneRefused',
    waves: [
      { enemies: [{ type: 'KAMAITACHI_LURKER', offset: at(-4, 2) }, { type: 'KAMAITACHI_LURKER', offset: at(4, -2) }, { type: 'TENGU', offset: at(-6, -7) }, { type: 'TENGU', offset: at(6, -7) }], delayAfterComplete: 0 },
    ],
  },
  {
    // Only if you turned her away in the forest
    id: 'enc_gate_akane', center: at(0, -44), activationRadius: 8, leashRadius: 18, reward: 100, charmReward: 'crimson_ribbon',
    requiresFlag: 'akaneRefused',
    once: true,
    waves: [{ enemies: [{ type: 'AKANE', offset: at(0, -5) }], delayAfterComplete: 0 }],
  },
  {
    id: 'enc_gate_boss', center: at(0, -70), activationRadius: 12, leashRadius: 40, reward: 300,
    waves: [{ enemies: [{ type: 'MAW_OF_YOMI', offset: at(0, -9) }], delayAfterComplete: 0 }],
  },
];

/**
 * The Gate Itself — Terraces of old stone climbing to the summit, where the
 * crimson gate stands open on Yomi. A gauntlet of everything the mountain has
 * thrown at you, gusts that shove you and your enemies' shots alike, and at
 * the top, the thing the gate was built to hold.
 */
export function buildGateOfYomi(collision: CollisionSystem): LevelRuntime {
  const b = new LevelBuilder('GateOfYomi', collision, 1203);
  const bounds = rect(-EDGE + 0.6, EDGE - 0.6, -100, 52);

  const stone = std(0x3a3238, { roughness: 0.95, flatShading: true });
  const paving = std(0x4a4248, { roughness: 0.9 });
  const cliff = std(0x2a2228, { roughness: 1, flatShading: true });
  const crimson = std(0x8a1a1a, { roughness: 0.6 });

  b.ground(rect(-24, 24, -104, 56), 0x2a2026, 0x3a2a30, 31);
  b.boundaryCliffs(rect(-22, 22, -104, 56), cliff, 9);
  for (const side of [1, -1]) {
    // Sheer drops either side of the path, kept back by a low parapet
    b.box(side * (EDGE + 0.3), -24, 0.6, 4.4, 152, stone, { solid: true, y: 0 });
  }

  // ─── Terraces and the ramps between them ────────────────────────────
  let previous = 0;
  let rampNorth = 30;
  for (const [north, south, height] of TERRACES) {
    // A ramp up from the terrace before, then the terrace itself
    b.ramp(rect(-EDGE, EDGE, north, rampNorth), 'z', height, previous, paving);
    b.box(0, (north + south) / 2, EDGE * 2, height, north - south, paving, { y: 0 });
    b.raise(rect(-EDGE, EDGE, south, north), height);
    previous = height;
    rampNorth = south;
  }

  // ─── Start, shrine and the long climb ───────────────────────────────
  b.shrine(-9, 44, Math.PI / 2);
  b.torii(0, 40, 0, 0.9);
  b.stoneLantern(-5, 33, 0xff4a4a);
  b.stoneLantern(5, 33, 0xff4a4a);
  // Broken torii line the climb, each a little more red than the last
  for (const [z, height] of [[8, 0.8], [-20, 1.6], [-46, 2.4]] as [number, number][]) {
    const torii = b.torii(0, z, 0, 0.75, height);
    torii.rotation.z = (b.random.next() - 0.5) * 0.08;
    b.stoneLantern(-7, z + 2, 0xff5a4a, height);
    b.stoneLantern(7, z + 2, 0xff5a4a, height);
  }
  for (let i = 0; i < 10; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const z = 30 - i * 13;
    const terrace = TERRACES.find(([n, s]) => z <= n && z >= s);
    b.rock(side * b.random.range(11, 14.5), z, b.random.range(0.8, 1.6), stone);
    if (terrace) b.group.children[b.group.children.length - 1].position.y += terrace[2];
  }

  // ─── The Gate ───────────────────────────────────────────────────────
  const top = TERRACES[TERRACES.length - 1][2];
  const gate = b.torii(0, -90, 0, 2.1, top);
  gate.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && (mesh.material as THREE.MeshStandardMaterial).color?.getHex() === 0x7a1515) mesh.material = crimson;
  });
  const veilMaterial = new THREE.MeshBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const veil = b.mesh(new THREE.PlaneGeometry(12.5, 15), veilMaterial, 0, top + 7.5, -90);
  veil.userData.noShadow = true;
  b.light(0, top + 5, -88, 0xff3a3a, 30, 26, 0.2, 9);
  b.solid(0, -91, 16, 1.4);
  for (const x of [-12, 12]) b.stoneLantern(x, -62, 0xff4a4a, top);

  b.finish();

  // ─── Rules: wind ────────────────────────────────────────────────────
  const wind = createWindStreaks();
  b.group.add(wind.object);
  const motes = createMotes(70, 0xff4a5a, { rise: 0.6, size: 0.14, spread: 18, height: 10 });
  b.group.add(motes.object);
  let calm = 7;
  let gust = 0;
  let isFirstGust = true;
  const direction = new THREE.Vector3(1, 0, 0);

  return {
    group: b.group,
    lights: b.lights,
    occluders: b.occluders,
    spawn: at(0, 46),
    bounds: { MIN_X: bounds.minX, MAX_X: bounds.maxX, MIN_Z: bounds.minZ, MAX_Z: bounds.maxZ },
    atmosphere: { fogColor: 0x2a0a16, fogDensity: 0.012, ambientColor: 0x8a3a5a, ambientIntensity: 1.35, moonIntensity: 2 },
    shrine: { id: 'gate_shrine', name: 'Summit Shrine', position: at(-9, 44), rest: at(-5.5, 44) },
    exit: at(0, -86),
    encounters: ENCOUNTERS,
    bossEncounterId: 'enc_gate_boss',
    secrets: SECRETS,
    audioZone: 'BOSS_ARENA',
    groundHeight: b.heightAt,
    footing: b.footingAt,
    update: ctx => {
      b.tick(ctx.time, ctx.dt);
      motes.update(ctx.dt, ctx.player.root.position, ctx.time);
      veilMaterial.opacity = (ctx.isBossDefeated ? 0.12 : 0.4) + Math.sin(ctx.time * 1.7) * 0.08;
      veil.scale.x = 1 + Math.sin(ctx.time * 0.9) * 0.02;

      // Calm, then a gust that builds, holds and dies
      if (gust > 0) {
        gust -= ctx.dt;
      } else {
        calm -= ctx.dt;
        if (calm <= 0) {
          calm = 5 + Math.random() * 4;
          gust = 2.6;
          const angle = (Math.random() > 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.8;
          direction.set(Math.cos(angle), 0, Math.sin(angle));
          if (isFirstGust) {
            isFirstGust = false;
            ctx.notice('The wind howls', 'Gusts shove you and bend shots aside. Raise your guard to brace against them.');
          }
        }
      }
      const strength = gust > 0 ? Math.sin(Math.min(1, (2.6 - gust) / 2.6) * Math.PI) : 0;
      wind.direction.copy(direction);
      wind.strength = strength;
      wind.update(ctx.dt, ctx.player.root.position, ctx.time);

      const brace = ctx.player.isBlocking ? 0.2 : 1;
      ctx.player.externalPush.copy(direction).multiplyScalar(5 * strength * brace);
      ctx.projectiles.applyWind(direction.clone().multiplyScalar(16 * strength), ctx.dt);
    },
    reset: () => {
      gust = 0;
      calm = 7;
    },
    dispose: () => {
      wind.dispose();
      motes.dispose();
      b.dispose();
    },
  };
}
