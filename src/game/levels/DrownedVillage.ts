import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';
import { LevelBuilder, std } from './LevelKit';
import { LevelRuntime, Rect } from './LevelTypes';
import { createRain } from './LevelEffects';
import { SecretDef } from '../world/WorldSecrets';
import { EncounterConfig } from '../encounters/EncounterConfig';
import { routeGuide } from './Wayfinding';
import { applySway } from '../utils/Wind';
import { getGlowTexture } from '../utils/ProceduralTextures';

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
    // It rises from the flood beyond the platform's far edge, then wades in
    waves: [{ enemies: [{ type: 'UMIBOZU', offset: at(-7, -17) }], delayAfterComplete: 0 }],
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

  b.ground(bounds, 0x2a2b24, 0x3a3a2e, 3, {
    mud: 0x3a3226, moss: 0x2e3a22, stone: 0x4a4c4e, ash: 0x222220, amount: { moss: 0.75, stone: 0.35, ash: 0 },
  });
  b.waterStyle({ rain: true, sky: 0x2e3e4e });
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

  // ─── Life at the water's edge ───────────────────────────────────────
  b.grass(rect(-26, 26, 30, 51), 2200, { colors: [0x4a5a2a, 0x6a7034], height: [0.35, 0.8] });
  b.grass(rect(-26, 26, -45, 29), 1800, { colors: [0x5a6430, 0x7a7238], height: [0.9, 1.7], width: 0.05, inWater: true });
  for (const [x, z, r] of [[-6, 36, 0.4], [7, 30, 2.6], [-12, 26, 1.2], [3, -48, 0], [-3, -48, 0]] as [number, number, number][]) {
    b.banner(x, z, 4.2, 0xd8d0c0, { rotY: r, torn: true, mark: 0x3a2a24 });
  }
  // The flood's tide line on the houses and posts
  for (let i = 0; i < 14; i++) b.decal('damp', b.random.range(-25, 25), b.random.range(26, 32), b.random.range(2, 4), { y: 0.03 });

  // ─── Cattails among the reeds ───────────────────────────────────────
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.018, 1, 4).translate(0, 0.5, 0);
  const headGeo = new THREE.CapsuleGeometry(0.045, 0.22, 2, 6);
  const stemMat = std(0x5a6a30, { roughness: 0.8 });
  const headMat = std(0x4a2e18, { roughness: 0.95 });
  stemMat.userData.noSurface = headMat.userData.noSurface = true;
  applySway(stemMat, 0.25);
  applySway(headMat, 0.25, true);
  const tails: THREE.Matrix4[] = [];
  const heads: THREE.Matrix4[] = [];
  for (let i = 0; i < 900 && tails.length < 260; i++) {
    const x = b.random.range(-26, 26);
    const z = b.random.range(-45, 29);
    if (b.footingAt(x, z) >= 1 || b.heightAt(x, z) > 0.2 || b.isSolidAt(x, z) || Math.abs(x) < 2.4) continue;
    const h = b.random.range(1.2, 2.1);
    const lean = new THREE.Quaternion().setFromEuler(new THREE.Euler(b.random.range(-0.12, 0.12), 0, b.random.range(-0.12, 0.12)));
    tails.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), lean, new THREE.Vector3(1, h, 1)));
    const top = new THREE.Vector3(0, h - 0.22, 0).applyQuaternion(lean).add(new THREE.Vector3(x, 0, z));
    heads.push(new THREE.Matrix4().compose(top, lean, new THREE.Vector3(1, 1, 1)));
  }
  const stems = new THREE.InstancedMesh(stemGeo, stemMat, tails.length);
  const tops = new THREE.InstancedMesh(headGeo, headMat, heads.length);
  tails.forEach((m, i) => stems.setMatrixAt(i, m));
  heads.forEach((m, i) => tops.setMatrixAt(i, m));
  stems.userData.noShadow = true;
  b.group.add(stems, tops);

  // ─── Lanterns for the drowned, drifting on the flood ────────────────
  // Tōrō nagashi: set on the water for the dead. Most still burn warm; a few burn cold.
  const floatBase = std(0x2a1c12, { roughness: 0.9 });
  const glowTexture = getGlowTexture();
  const floaters: { group: THREE.Group; x: number; z: number; phase: number; radius: number }[] = [];
  for (let i = 0; i < 400 && floaters.length < 26; i++) {
    const x = b.random.range(-25, 25);
    const z = b.random.range(-94, 28);
    if (b.footingAt(x, z) >= 1 || b.heightAt(x, z) > 0.2 || b.isSolidAt(x, z) || Math.abs(x) < 3) continue;
    if (floaters.some(f => Math.hypot(f.x - x, f.z - z) < 3.2)) continue;
    const isCold = b.random.next() < 0.3;
    const color = isCold ? 0x9ad8ff : 0xffa850;
    const group = new THREE.Group();
    group.userData.dynamic = true;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.42), floatBase);
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.3),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: isCold ? 1.6 : 1.9, roughness: 0.8 }));
    paper.material.userData.noSurface = true;
    paper.position.y = 0.2;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.36), floatBase);
    cap.position.y = 0.38;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
    halo.scale.setScalar(1.6);
    halo.position.y = 0.22;
    group.add(base, paper, cap, halo);
    group.position.set(x, 0.12, z);
    group.rotation.y = b.random.next() * Math.PI;
    for (const m of [base, paper, cap]) m.userData.noShadow = true;
    b.group.add(group);
    floaters.push({ group, x, z, phase: b.random.next() * Math.PI * 2, radius: b.random.range(0.3, 0.9) });
  }
  b.onTick(time => {
    for (const f of floaters) {
      const t = time * 0.18 + f.phase;
      f.group.position.set(f.x + Math.cos(t) * f.radius, 0.12 + Math.sin(time * 1.3 + f.phase) * 0.03, f.z + Math.sin(t * 0.8) * f.radius);
      f.group.rotation.y += 0.002;
      f.group.rotation.z = Math.sin(time * 1.1 + f.phase) * 0.05;
      f.group.rotation.x = Math.cos(time * 0.9 + f.phase) * 0.05;
    }
  });

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
    atmosphere: { fogColor: 0x24303c, fogDensity: 0.017, ambientColor: 0x5a7088, ambientIntensity: 1.2, cloudiness: 0.95, wetness: 1 },
    shrine: { id: 'village_shrine', name: 'Drowned Shrine', position: at(-10, 40), rest: at(-6.5, 40) },
    exit: at(0, -88),
    encounters: ENCOUNTERS,
    bossEncounterId: 'enc_village_boss',
    secrets: SECRETS,
    audioZone: 'FOREST',
    groundHeight: b.heightAt,
    footing: b.footingAt,
    map: b.mapData(),
    // Down the boardwalk to the drowned shrine, then on to the gate
    guide: routeGuide(
      [at(0, 46), at(0, 36), at(0, 26), at(0, -10), at(0, -30), at(0, -46), at(0, -62)],
      [at(0, -78), at(0, -86)],
    ),
    haunt: { color: 0x6ae4ff, tint: 0x7a9aa6, extra: 'drip' },
    update: ctx => {
      b.tick(ctx.time, ctx.dt, ctx.camera.camera);
      exit.update(ctx.time);
      exit.setOpen(ctx.isBossDefeated);
      rain.update(ctx.dt, ctx.player.root.position, ctx.time);
      // The water glows and rings where Umibōzu rises from it
      const umibozu = ctx.enemies.find(e => e.enemyType === 'UMIBOZU' && !e.health.isDead);
      b.waterSurface?.setGlow(umibozu ? umibozu.root.position : null);

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
      stemGeo.dispose();
      headGeo.dispose();
      b.dispose();
    },
  };
}
