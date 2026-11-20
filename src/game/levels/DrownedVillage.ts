import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';
import { LevelBuilder, std } from './LevelKit';
import { LevelRuntime, Rect } from './LevelTypes';
import { createRain } from './LevelEffects';
import { SecretDef } from '../world/WorldSecrets';
import { EncounterConfig } from '../encounters/EncounterConfig';

const at = (x: number, z: number) => new THREE.Vector3(x, 0, z);
const rect = (minX: number, maxX: number, minZ: number, maxZ: number): Rect => ({ minX, maxX, minZ, maxZ });

const BOARDWALK = 0.6;
const ROOF = 1.8;

const SECRETS: SecretDef[] = [
  { id: 'village_charm', kind: 'charm', charmId: 'river_stone', x: -19, z: -29 },
  {
    id: 'village_scroll', kind: 'scroll', x: 15.5, z: 31,
    scroll: [
      { id: 'vs_0', speaker: "A Fisherman's Tally", text: 'The river rose three hands this week and did not fall. The headman says it is the spring melt. There is no snow left on the mountain.', next: 'vs_1' },
      { id: 'vs_1', speaker: "A Fisherman's Tally", text: 'Something walks the flooded street at night, tall as the temple roof, and the water goes black where it passes. We have stopped lighting lanterns.' },
    ],
  },
  { id: 'village_cache', kind: 'cache', essence: 70, x: 13, z: 1, y: ROOF },
];

const ENCOUNTERS: EncounterConfig[] = [
  {
    id: 'enc_village_1', center: at(0, 18), activationRadius: 11, leashRadius: 22, reward: 40,
    waves: [
      { enemies: [{ type: 'KAPPA', offset: at(-6, -2) }, { type: 'KAPPA', offset: at(6, -3) }], delayAfterComplete: 1.2 },
      { enemies: [{ type: 'KAPPA', offset: at(0, -7) }, { type: 'SHADOW_YOKAI', offset: at(-7, -6) }, { type: 'SHADOW_YOKAI', offset: at(7, -6) }], delayAfterComplete: 0 },
    ],
  },
  {
    // Fought up on the rooftops; everything starts up there with you
    id: 'enc_village_roof', center: at(8, -2), activationRadius: 5.5, leashRadius: 18, reward: 50,
    waves: [
      { enemies: [{ type: 'KAPPA', offset: at(-1, -4) }, { type: 'KAPPA', offset: at(7, 4) }, { type: 'TENGU', offset: at(8, -4) }], delayAfterComplete: 1.5 },
      { enemies: [{ type: 'KAPPA', offset: at(5, 1), eliteName: 'The Old Kappa of the Well' }], delayAfterComplete: 0 },
    ],
  },
  {
    id: 'enc_village_3', center: at(0, -34), activationRadius: 11, leashRadius: 22, reward: 50,
    waves: [
      { enemies: [{ type: 'KAPPA', offset: at(-5, -3) }, { type: 'KAPPA', offset: at(5, -3) }, { type: 'KAPPA', offset: at(0, -6) }, { type: 'TENGU', offset: at(-8, -8) }], delayAfterComplete: 0 },
    ],
  },
  {
    id: 'enc_village_boss', center: at(0, -64), activationRadius: 10, leashRadius: 40, reward: 120,
    waves: [{ enemies: [{ type: 'UMIBOZU', offset: at(0, -9) }], delayAfterComplete: 0 }],
  },
];

/**
 * The Drowned Village — A fishing village the river swallowed. A boardwalk
 * runs down the flooded street; the water either side slows anyone but a
 * kappa. Rooftops rise above it, and Umibōzu waits where the shrine stood.
 */
export function buildDrownedVillage(collision: CollisionSystem): LevelRuntime {
  const b = new LevelBuilder('DrownedVillage', collision, 5521);
  const bounds = rect(-27, 27, -96, 52);

  const mud = std(0x2b2a24, { roughness: 1 });
  const wood = std(0x3a2a1c, { roughness: 0.9 });
  const darkWood = std(0x22180f, { roughness: 0.9 });
  const rockMat = std(0x34383c, { roughness: 1, flatShading: true });

  b.ground(bounds, 0x2a2b24, 0x3a3a2e, 3);
  b.boundaryCliffs(rect(-30, 30, -100, 56), rockMat, 7);

  // ─── The flood ──────────────────────────────────────────────────────
  b.water(rect(-27, 27, -46, 30), 0x1a2a34, 0.55);
  b.water(rect(-27, 27, -96, -46), 0x0e1a24, 0.45);

  // The dry street at the top of the village
  b.shrine(-10, 40, Math.PI / 2);
  b.torii(0, 38.5, 0, 0.9);
  b.hangingLantern(4, 44);
  b.hangingLantern(-4.5, 34);
  b.house(14, 40, 6, 5, 0.1);
  b.house(-17, 30, 6, 5, -0.15, { sunk: 0.2 });

  // ─── Boardwalks ─────────────────────────────────────────────────────
  b.deck(rect(-1.6, 1.6, -46, 30), BOARDWALK, wood, darkWood);
  b.deck(rect(-6, 6, 13, 23), BOARDWALK, wood, darkWood);           // The landing where the first fight happens
  b.deck(rect(-12, -1.6, -20, -16), BOARDWALK, wood, darkWood);     // A spur out to the sunken houses
  b.deck(rect(-6, 6, -40, -28), BOARDWALK, wood, darkWood);         // The crossing before the shrine
  for (let z = 26; z > -46; z -= 11) {
    b.hangingLantern(z % 2 === 0 ? 2.2 : -2.2, z, 0xffa040, BOARDWALK);
  }

  // ─── The rooftops ───────────────────────────────────────────────────
  // Two houses so close their roofs make one floor, reached up a plank ramp
  b.house(9, -5, 5, 5, 0, { sunk: 0.4, height: 2.2, flat: true });
  b.house(14, 0, 5, 5, 0, { sunk: 0.4, height: 2.2, flat: true });
  b.deck(rect(6, 17, -8, 4), ROOF, std(0x5a4c40, { roughness: 0.75, flatShading: true }), darkWood);
  // A low rail around the roof's edge, open where the ramp comes up
  for (const [x, z, w, d] of [[17.2, -2, 0.25, 12], [11.5, -8.1, 11.4, 0.25], [11.5, 4.1, 11.4, 0.25], [5.9, -5.6, 0.25, 5], [5.9, 2.6, 0.25, 3.2]]) {
    b.box(x, z, w, 0.45, d, darkWood, { y: ROOF });
  }
  b.ramp(rect(1.6, 6, -3, 1), 'x', BOARDWALK, ROOF, wood);
  // The houses' own colliders would wall off the roof: replace them with the roof's edge
  collision.boxes.splice(collision.boxes.length - 2, 2);
  b.solid(17.4, -2, 0.4, 12);
  b.solid(11.5, -8.3, 11, 0.4);
  b.solid(11.5, 4.3, 11, 0.4);
  b.solid(5.8, -5.6, 0.4, 5.2);
  b.solid(5.8, 2.6, 0.4, 3.4);
  b.hangingLantern(16, 3, 0xffa040, ROOF);

  // ─── Sunken houses along the flooded street ─────────────────────────
  const houses: [number, number, number, number, number][] = [
    [-13, 20, 6, 5, 0.2], [13, 22, 6, 5, -0.1], [-15, 6, 5, 6, 0.4], [-14, -9, 6, 5, -0.3],
    [-16, -24, 5, 5, 0.1], [15, -18, 6, 5, 0.25], [14, -32, 5, 6, -0.2], [-15, -38, 6, 5, 0.15],
  ];
  for (const [x, z, w, d, r] of houses) b.house(x, z, w, d, r, { sunk: 0.5 + b.random.next() * 0.5 });
  for (let i = 0; i < 14; i++) {
    const x = (b.random.next() > 0.5 ? 1 : -1) * b.random.range(5, 24);
    const z = b.random.range(-44, 26);
    // Driftwood and posts poking out of the water
    const post = b.box(x, z, 0.25, b.random.range(0.8, 1.8), 0.25, darkWood);
    post.rotation.z = b.random.range(-0.3, 0.3);
  }

  // ─── The drowned shrine, where Umibōzu rises ────────────────────────
  b.deck(rect(-14, 14, -78, -50), BOARDWALK, std(0x3a3630, { roughness: 0.95 }), darkWood);
  for (const [x, z] of [[-12, -52], [12, -52], [-12, -76], [12, -76]]) b.stoneLantern(x, z, 0x8ac8ff, BOARDWALK);
  for (const x of [-14.3, 14.3]) b.solid(x, -64, 0.3, 28);
  const exit = b.exitGate(0, -88, 0, 0x8ac8ff);
  b.deck(rect(-3, 3, -92, -78), BOARDWALK, wood, darkWood);

  // ─── Secrets ────────────────────────────────────────────────────────
  b.deck(rect(-21, -17, -31, -27), 0.4, darkWood);

  b.finish();

  // ─── Rules: rain, and lightning now and then ────────────────────────
  const rain = createRain();
  b.group.add(rain.object);
  let lightning = 6;
  let flash = 0;

  return {
    group: b.group,
    lights: b.lights,
    occluders: b.occluders,
    spawn: at(0, 46),
    bounds: { MIN_X: bounds.minX, MAX_X: bounds.maxX, MIN_Z: bounds.minZ, MAX_Z: bounds.maxZ },
    atmosphere: { fogColor: 0x24303c, fogDensity: 0.017, ambientColor: 0x5a7088, ambientIntensity: 1.2 },
    shrine: { id: 'village_shrine', name: 'Drowned Shrine', position: at(-10, 40), rest: at(-6.5, 40) },
    exit: at(0, -88),
    encounters: ENCOUNTERS,
    bossEncounterId: 'enc_village_boss',
    secrets: SECRETS,
    audioZone: 'FOREST',
    groundHeight: b.heightAt,
    footing: b.footingAt,
    update: ctx => {
      b.tick(ctx.time, ctx.dt);
      exit.update(ctx.time);
      exit.setOpen(ctx.isBossDefeated);
      rain.update(ctx.dt, ctx.player.root.position, ctx.time);

      lightning -= ctx.dt;
      if (lightning <= 0) {
        lightning = 7 + Math.random() * 9;
        flash = 0.35;
        ctx.camera.addShake(0.25);
      }
      if (flash > 0) {
        flash -= ctx.dt;
        const strength = Math.max(0, flash / 0.35);
        return { ambientIntensity: 1.2 + strength * 3.5, ambientColor: 0xc8d8ff };
      }
    },
    reset: () => {},
    dispose: () => {
      rain.dispose();
      b.dispose();
    },
  };
}
