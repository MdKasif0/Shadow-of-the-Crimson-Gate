import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';
import { LevelBuilder, std } from './LevelKit';
import { LevelContext, LevelRuntime, Rect, inRect } from './LevelTypes';
import { createMotes } from './LevelEffects';
import { SecretDef } from '../world/WorldSecrets';
import { EncounterConfig } from '../encounters/EncounterConfig';
import { SeededRandom } from '../utils/MathUtils';
import { EventBus } from '../core/EventBus';

const at = (x: number, z: number) => new THREE.Vector3(x, 0, z);
const rect = (minX: number, maxX: number, minZ: number, maxZ: number): Rect => ({ minX, maxX, minZ, maxZ });

const TILE = 2;
const FLOOR = 0.2;
const CRACK_SECONDS = 0.65;
const ESCAPE_SECONDS = 45;
const FALL_DAMAGE = 20;

const HALL = rect(-4, 4, 4, 28);
const ESCAPE = rect(-3, 3, -96, -70);
const MAIN_HALL = rect(-16, 16, -70, -34);

const SECRETS: SecretDef[] = [
  { id: 'temple_charm', kind: 'charm', charmId: 'ash_sutra', x: 15, z: -26 },
  {
    id: 'temple_scroll', kind: 'scroll', x: -14.5, z: 47,
    scroll: [
      { id: 'ts_0', speaker: 'The Last Novice', text: 'Master Kagemori came back from the gate with his eyes burning. He said the fire was a gift. By morning the others were praying to it.', next: 'ts_1' },
      { id: 'ts_1', speaker: 'The Last Novice', text: 'He was the finest sword in the province. He still is. I am writing this under the floor of the long hall. The boards are rotten. He does not know they will not hold him.' },
    ],
  },
  { id: 'temple_cache', kind: 'cache', essence: 110, x: -14, z: -8 },
];

const ENCOUNTERS: EncounterConfig[] = [
  {
    id: 'enc_temple_gate', center: at(0, 38), activationRadius: 9, leashRadius: 18, reward: 50,
    waves: [
      { enemies: [{ type: 'POSSESSED_MONK', offset: at(-5, -4) }, { type: 'BASIC_YOKAI', offset: at(3, -3) }, { type: 'SHIELDED_YOKAI', offset: at(5, -5) }], delayAfterComplete: 1.2 },
      { enemies: [{ type: 'POSSESSED_MONK', offset: at(5, -6) }, { type: 'POSSESSED_MONK', offset: at(-5, -6) }], delayAfterComplete: 0 },
    ],
  },
  {
    id: 'enc_temple_court', center: at(0, -10), activationRadius: 11, leashRadius: 20, reward: 70,
    hazard: { interval: 6, radius: 2.6, damage: 18 },
    waves: [
      { enemies: [{ type: 'POSSESSED_MONK', offset: at(-6, -4) }, { type: 'TENGU', offset: at(7, -7) }, { type: 'BASIC_YOKAI', offset: at(0, -3) }, { type: 'BASIC_YOKAI', offset: at(3, -2) }], delayAfterComplete: 1.5 },
      { enemies: [{ type: 'POSSESSED_MONK', offset: at(0, -7), eliteName: 'Abbot of Cinders' }, { type: 'POSSESSED_MONK', offset: at(-6, -5) }], delayAfterComplete: 0 },
    ],
  },
  {
    id: 'enc_temple_boss', center: at(0, -50), activationRadius: 10, leashRadius: 30, reward: 150,
    waves: [{ enemies: [{ type: 'FALLEN_SAMURAI', offset: at(0, -10) }], delayAfterComplete: 0 }],
  },
];

interface Tile {
  x: number;
  z: number;
  isRotten: boolean;
  state: 'solid' | 'cracking' | 'fallen';
  timer: number;
  mesh: THREE.Mesh;
}

/**
 * The Burning Temple — The monks' home, burning and not burning down. Fire
 * spreads over the courtyards, the long hall's floor gives way underfoot, and
 * when the master falls the whole place comes down: run.
 */
export function buildBurningTemple(collision: CollisionSystem): LevelRuntime {
  const b = new LevelBuilder('BurningTemple', collision, 9091);
  const bounds = rect(-24, 24, -104, 52);

  const ash = std(0x2a2220, { roughness: 1 });
  const wall = std(0x3a2a24, { roughness: 0.95 });
  const timber = std(0x1a100c, { roughness: 0.9 });
  const boards = std(0x4a3020, { roughness: 0.85 });
  const stone = std(0x3a3638, { roughness: 1, flatShading: true });
  const lacquer = std(0x5a1410, { roughness: 0.6 });

  b.ground(bounds, 0x2a201c, 0x3a2a22, 21);
  b.boundaryCliffs(rect(-27, 27, -108, 56), stone, 7);

  // ─── The compound walls ─────────────────────────────────────────────
  const wallRun = (x0: number, z0: number, x1: number, z1: number, height = 3.2) => {
    const w = Math.abs(x1 - x0) || 0.8;
    const d = Math.abs(z1 - z0) || 0.8;
    b.box((x0 + x1) / 2, (z0 + z1) / 2, w, height, d, wall, { solid: true });
    b.box((x0 + x1) / 2, (z0 + z1) / 2, w + 0.4, 0.3, d + 0.4, timber, { y: height });
  };
  // Outer walls, down both sides
  wallRun(-18, 30, -18, -34);
  wallRun(18, 30, 18, -34);
  // The gatehouse wall, opening onto the long hall
  wallRun(-18, 30, -4.4, 30);
  wallRun(4.4, 30, 18, 30);
  // The long hall's own walls
  wallRun(-4.4, 30, -4.4, 4, 4);
  wallRun(4.4, 30, 4.4, 4, 4);
  for (let z = 28; z > 4; z -= 6) {
    b.box(0, z, 9.2, 0.35, 0.35, timber, { y: 4.2 });
  }
  // Between the hall and the inner court, the back of the outer compound
  wallRun(-18, 4, -4.4, 4);
  wallRun(4.4, 4, 18, 4);
  // The main hall
  wallRun(-16, -34, -4, -34, 5);
  wallRun(4, -34, 16, -34, 5);
  wallRun(-16, -34, -16, -70, 5);
  wallRun(16, -34, 16, -70, 5);
  wallRun(-16, -70, -3.2, -70, 5);
  wallRun(3.2, -70, 16, -70, 5);
  // Close the gaps between the outer compound and the main hall
  wallRun(-18, -34, -16, -34);
  wallRun(16, -34, 18, -34);
  // The escape passage
  wallRun(-3.4, -70, -3.4, -98, 4);
  wallRun(3.4, -70, 3.4, -98, 4);

  // The rear door stays shut until the master falls
  const doorBox = new THREE.Box3(new THREE.Vector3(-3.2, 0, -70.6), new THREE.Vector3(3.2, 8, -69.4));
  collision.addBox(doorBox);
  const door = b.box(0, -70, 6.4, 4.6, 0.5, lacquer);
  door.userData.dynamic = true;

  // ─── Entry courtyard ────────────────────────────────────────────────
  b.shrine(-11, 44, Math.PI / 2);
  b.torii(0, 41, 0, 0.9);
  b.house(-15, 36, 5, 5, 0.1, { burnt: true });
  b.house(14, 44, 6, 5, -0.15, { burnt: true });
  b.stoneLantern(-5, 33);
  b.stoneLantern(5, 33);
  b.flames(13, 36, 1.2);
  b.flames(-14, 30.5, 0.9);

  // ─── The long hall, whose floor is rotten in places ─────────────────
  b.raise(HALL, FLOOR);
  b.raise(ESCAPE, FLOOR);
  const pit = new THREE.MeshBasicMaterial({ color: 0x1a0402 });
  for (const area of [HALL, ESCAPE]) {
    const plane = b.mesh(new THREE.PlaneGeometry(area.maxX - area.minX, area.maxZ - area.minZ).rotateX(-Math.PI / 2), pit,
      (area.minX + area.maxX) / 2, 0.05, (area.minZ + area.maxZ) / 2);
    plane.userData.noShadow = true;
  }
  const tiles: Tile[] = [];
  const layTiles = (area: Rect, seed: number, rottenShare: number) => {
    const random = new SeededRandom(seed);
    const cols = Math.round((area.maxX - area.minX) / TILE);
    const rowsCount = Math.round((area.maxZ - area.minZ) / TILE);
    // A safe line through, wandering a column at a time
    let safeCol = Math.floor(cols / 2);
    const safe = new Set<string>();
    for (let row = 0; row < rowsCount; row++) {
      safe.add(`${row},${safeCol}`);
      if (random.next() > 0.55) {
        const next = THREE.MathUtils.clamp(safeCol + (random.next() > 0.5 ? 1 : -1), 0, cols - 1);
        safe.add(`${row},${next}`);
        safeCol = next;
      }
    }
    const solidMat = boards;
    const rottenMat = std(0x2a1810, { roughness: 1, emissive: 0x3a0a02, emissiveIntensity: 0.6 });
    for (let row = 0; row < rowsCount; row++) {
      for (let col = 0; col < cols; col++) {
        const isRotten = !safe.has(`${row},${col}`) && random.next() < rottenShare;
        const x = area.minX + (col + 0.5) * TILE;
        const z = area.maxZ - (row + 0.5) * TILE;
        const mesh = b.mesh(new THREE.BoxGeometry(TILE - 0.06, 0.14, TILE - 0.06), isRotten ? rottenMat.clone() : solidMat, x, FLOOR - 0.07, z);
        mesh.userData.dynamic = true;
        tiles.push({ x, z, isRotten, state: 'solid', timer: 0, mesh });
      }
    }
  };
  layTiles(HALL, 31, 0.5);
  layTiles(ESCAPE, 77, 0.55);

  // ─── Inner courtyard and pagoda ─────────────────────────────────────
  const pagoda = new THREE.Group();
  pagoda.position.set(10, 0, -14);
  b.group.add(pagoda);
  for (let i = 0; i < 4; i++) {
    const size = 5 - i * 0.9;
    const y = i * 2.2;
    b.mesh(new THREE.BoxGeometry(size * 0.7, 2, size * 0.7), wall, 0, y + 1, 0, pagoda);
    const roof = b.mesh(new THREE.ConeGeometry(size * 0.85, 0.9, 4), timber, 0, y + 2.3, 0, pagoda);
    roof.rotation.y = Math.PI / 4;
  }
  b.mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), std(0xb08a3a, { metalness: 0.8, roughness: 0.3 }), 0, 10, 0, pagoda);
  b.solid(10, -14, 3.8, 3.8);
  b.occluders.push(pagoda);
  b.flames(12.5, -11, 1.3, 6.5);
  for (const [x, z] of [[-12, -2], [-10, -24], [13, 0], [-6, -30]]) b.flames(x, z, 0.8);
  b.stoneLantern(-4, -31);
  b.stoneLantern(4, -31);

  // ─── The main hall ──────────────────────────────────────────────────
  const hallFloor = b.mesh(new THREE.PlaneGeometry(32, 36).rotateX(-Math.PI / 2), boards, 0, 0.1, -52);
  hallFloor.userData.noShadow = true;
  for (const x of [-8, 8]) {
    for (const z of [-42, -52, -62]) {
      b.mesh(new THREE.CylinderGeometry(0.45, 0.5, 6, 10), lacquer, x, 3, z);
      b.pillar(x, z, 0.6);
    }
  }
  for (const [x, z] of [[-14, -36], [14, -36], [-14, -68], [14, -68]]) b.flames(x, z, 1.1);
  b.mesh(new THREE.BoxGeometry(6, 3, 1), std(0xb08a3a, { metalness: 0.7, roughness: 0.4 }), 0, 2.2, -68.8);

  const exit = b.exitGate(0, -98, 0, 0xffa040);

  // Permanent fires, lit once the level is entered
  const standingFires: [number, number, number][] = [[8, 41, 1.8], [-9, 35, 1.6], [-10, -6, 2.4], [6, -24, 2], [-13, -18, 2]];

  b.finish();
  const embers = createMotes(160, 0xff8a3a, { rise: 1.6, size: 0.11, spread: 18, height: 9 });
  b.group.add(embers.object);

  // ─── Rules ──────────────────────────────────────────────────────────
  let firesLit = false;
  let debrisTimer = 6;
  let escape: 'idle' | 'running' | 'done' = 'idle';
  let escapeTime = 0;
  let lastSafe = at(0, 46);

  const doorOpen = () => {
    door.visible = false;
    const i = collision.boxes.indexOf(doorBox);
    if (i >= 0) collision.boxes.splice(i, 1);
  };

  const updateTiles = (ctx: LevelContext) => {
    const p = ctx.player.root.position;
    const inHall = inRect(HALL, p.x, p.z) || inRect(ESCAPE, p.x, p.z);
    let under: Tile | null = null;
    for (const tile of tiles) {
      if (tile.state === 'cracking') {
        tile.timer += ctx.dt;
        tile.mesh.position.y = FLOOR - 0.07 + Math.sin(tile.timer * 60) * 0.02;
        (tile.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + tile.timer * 4;
        if (tile.timer >= CRACK_SECONDS) {
          tile.state = 'fallen';
          tile.timer = 0;
        }
      } else if (tile.state === 'fallen' && tile.mesh.visible) {
        tile.timer += ctx.dt;
        tile.mesh.position.y -= ctx.dt * (2 + tile.timer * 12);
        tile.mesh.rotation.x += ctx.dt * 2;
        if (tile.timer > 0.8) tile.mesh.visible = false;
      }
      if (inHall && Math.abs(p.x - tile.x) < TILE / 2 && Math.abs(p.z - tile.z) < TILE / 2) under = tile;
    }

    if (!inHall) {
      lastSafe.copy(p);
      return;
    }
    if (!under) return;
    if (under.state === 'solid') {
      if (under.isRotten) {
        under.state = 'cracking';
        under.timer = 0;
        ctx.camera.addShake(0.15);
      } else {
        lastSafe.set(under.x, 0, under.z);
      }
    } else if (under.state === 'fallen' && under.timer > 0.05) {
      // Through the floor: a hard landing in the cellar, and a climb back up
      ctx.hurtPlayer(FALL_DAMAGE, 'FELL THROUGH');
      ctx.teleportPlayer(lastSafe.clone().setY(FLOOR));
      ctx.camera.addShake(1);
    }
  };

  return {
    group: b.group,
    lights: b.lights,
    occluders: b.occluders,
    spawn: at(0, 46),
    bounds: { MIN_X: bounds.minX, MAX_X: bounds.maxX, MIN_Z: bounds.minZ, MAX_Z: bounds.maxZ },
    atmosphere: { fogColor: 0x2a1006, fogDensity: 0.016, ambientColor: 0xa85a38, ambientIntensity: 1.25, moonIntensity: 1.4 },
    shrine: { id: 'temple_shrine', name: 'Cinder Shrine', position: at(-11, 44), rest: at(-7.5, 44) },
    exit: at(0, -98),
    encounters: ENCOUNTERS,
    bossEncounterId: 'enc_temple_boss',
    secrets: SECRETS,
    audioZone: 'BOSS_ARENA',
    groundHeight: b.heightAt,
    footing: b.footingAt,
    defersCompletion: true,
    update: ctx => {
      b.tick(ctx.time, ctx.dt);
      exit.update(ctx.time);
      embers.update(ctx.dt, ctx.player.root.position, ctx.time);
      const p = ctx.player.root.position;

      if (!firesLit) {
        firesLit = true;
        for (const [x, z, radius] of standingFires) ctx.spawnHazard('fire', at(x, z), radius, 14, 1e9);
      }
      updateTiles(ctx);

      // Burning beams fall in the open courtyards
      const inCourtyards = p.z < 30 && p.z > -34 && !inRect(HALL, p.x, p.z);
      debrisTimer -= ctx.dt;
      if (debrisTimer <= 0 && (inCourtyards || escape === 'running')) {
        debrisTimer = escape === 'running' ? 1.3 : 8 + Math.random() * 4;
        const ahead = escape === 'running' ? -3 - Math.random() * 4 : (Math.random() - 0.5) * 6;
        ctx.spawnHazard('fire', at(p.x + (Math.random() - 0.5) * 4, p.z + ahead), 1.8, 16, 4);
      }

      // The escape
      const escaped = ctx.memory.has('temple_escaped');
      if (ctx.isBossDefeated && !escaped) {
        if (escape === 'idle' && p.z < -36) {
          escape = 'running';
          escapeTime = ESCAPE_SECONDS;
          doorOpen();
          ctx.camera.addShake(2.5);
          ctx.notice('The temple is coming down', 'Run through the rear door and reach the gate before the fire does.');
        }
        if (escape === 'running') {
          escapeTime -= ctx.dt;
          ctx.setCountdown('ESCAPE', Math.max(0, escapeTime));
          if (Math.random() < ctx.dt * 0.8) ctx.camera.addShake(0.4);
          if (p.z < -93) {
            escape = 'done';
            ctx.memory.add('temple_escaped');
            EventBus.emit('templeEscaped', { remaining: escapeTime });
            ctx.setCountdown('ESCAPE', null);
            ctx.completeLevel();
            ctx.notice('You made it out', 'Behind you, the long hall folds into the fire.');
          } else if (escapeTime <= 0) {
            ctx.setCountdown('ESCAPE', null);
            ctx.hurtPlayer(9999, 'CONSUMED BY FIRE');
          }
        }
      }
      if (escaped) doorOpen();
      exit.setOpen(escaped);

      return escape === 'running'
        ? { ambientColor: 0xff6a2a, ambientIntensity: 1.6 + Math.sin(ctx.time * 9) * 0.25, fogColor: 0x4a1406, fogDensity: 0.022 }
        : undefined;
    },
    reset: () => {
      for (const tile of tiles) {
        tile.state = 'solid';
        tile.timer = 0;
        tile.mesh.visible = true;
        tile.mesh.position.y = FLOOR - 0.07;
        tile.mesh.rotation.set(0, 0, 0);
        if (tile.isRotten) (tile.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
      }
      if (escape === 'running') escape = 'idle';
      firesLit = false;
      debrisTimer = 6;
    },
    dispose: () => {
      embers.dispose();
      b.dispose();
    },
  };
}
