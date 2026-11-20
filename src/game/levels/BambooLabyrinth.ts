import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';
import { LevelBuilder, std } from './LevelKit';
import { LevelRuntime, Rect } from './LevelTypes';
import { createMotes } from './LevelEffects';
import { SecretDef } from '../world/WorldSecrets';
import { EncounterConfig, EnemySpawnDef } from '../encounters/EncounterConfig';
import { SeededRandom } from '../utils/MathUtils';

const at = (x: number, z: number) => new THREE.Vector3(x, 0, z);
const rect = (minX: number, maxX: number, minZ: number, maxZ: number): Rect => ({ minX, maxX, minZ, maxZ });

const COLS = 8;
const ROWS = 12;
const CELL = 6;
const LEFT = -24;
const TOP = 36;
const ENTRY_COL = 4;
const EXIT_COL = 3;

const cellX = (c: number) => LEFT + (c + 0.5) * CELL;
const cellZ = (r: number) => TOP - (r + 0.5) * CELL;

interface Maze {
  /** horizontal[r][c]: the wall along the top edge of row r (r = ROWS is the bottom edge). */
  horizontal: boolean[][];
  /** vertical[r][c]: the wall along the left edge of column c (c = COLS is the right edge). */
  vertical: boolean[][];
  path: [number, number][];
  deadEnds: [number, number][];
}

/** A perfect maze carved by depth-first search, with a few walls knocked out to make loops. */
function carveMaze(random: SeededRandom): Maze {
  const horizontal = Array.from({ length: ROWS + 1 }, () => Array(COLS).fill(true));
  const vertical = Array.from({ length: ROWS }, () => Array(COLS + 1).fill(true));
  const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const stack: [number, number][] = [[0, ENTRY_COL]];
  seen[0][ENTRY_COL] = true;

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const options: [number, number][] = [];
    if (r > 0 && !seen[r - 1][c]) options.push([r - 1, c]);
    if (r < ROWS - 1 && !seen[r + 1][c]) options.push([r + 1, c]);
    if (c > 0 && !seen[r][c - 1]) options.push([r, c - 1]);
    if (c < COLS - 1 && !seen[r][c + 1]) options.push([r, c + 1]);
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [nr, nc] = options[Math.floor(random.next() * options.length)];
    if (nr !== r) horizontal[Math.max(r, nr)][c] = false;
    else vertical[r][Math.max(c, nc)] = false;
    seen[nr][nc] = true;
    stack.push([nr, nc]);
  }

  // Loops, so a wrong turn isn't always a long walk back
  for (let i = 0; i < 9; i++) {
    const r = 1 + Math.floor(random.next() * (ROWS - 2));
    const c = 1 + Math.floor(random.next() * (COLS - 2));
    if (random.next() > 0.5) horizontal[r][c] = false;
    else vertical[r][c] = false;
  }
  horizontal[0][ENTRY_COL] = false;
  horizontal[ROWS][EXIT_COL] = false;

  const open = (r: number, c: number): [number, number][] => {
    const out: [number, number][] = [];
    if (r > 0 && !horizontal[r][c]) out.push([r - 1, c]);
    if (r < ROWS - 1 && !horizontal[r + 1][c]) out.push([r + 1, c]);
    if (c > 0 && !vertical[r][c]) out.push([r, c - 1]);
    if (c < COLS - 1 && !vertical[r][c + 1]) out.push([r, c + 1]);
    return out;
  };

  // The way through, by breadth-first search
  const previous = new Map<string, [number, number] | null>([[`0,${ENTRY_COL}`, null]]);
  const queue: [number, number][] = [[0, ENTRY_COL]];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === ROWS - 1 && c === EXIT_COL) break;
    for (const next of open(r, c)) {
      const key = `${next[0]},${next[1]}`;
      if (previous.has(key)) continue;
      previous.set(key, [r, c]);
      queue.push(next);
    }
  }
  const path: [number, number][] = [];
  let step: [number, number] | null = [ROWS - 1, EXIT_COL];
  while (step) {
    path.unshift(step);
    step = previous.get(`${step[0]},${step[1]}`) ?? null;
  }

  const onPath = new Set(path.map(([r, c]) => `${r},${c}`));
  const deadEnds: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!onPath.has(`${r},${c}`) && open(r, c).length === 1) deadEnds.push([r, c]);
    }
  }
  return { horizontal, vertical, path, deadEnds };
}

/**
 * The Bamboo Labyrinth — A grove grown into a maze, too dark to see far.
 * Blue lanterns mark the true path for those who notice them. Kamaitachi
 * wait in the side passages, and Jorōgumo has strung her web at the far end.
 */
export function buildBambooLabyrinth(collision: CollisionSystem): LevelRuntime {
  const b = new LevelBuilder('BambooLabyrinth', collision, 7817);
  const bounds = rect(-26, 26, -76, 52);
  const maze = carveMaze(new SeededRandom(4243));

  b.ground(bounds, 0x1c2418, 0x2a3220, 11);
  const rockMat = std(0x2a2e28, { roughness: 1, flatShading: true });
  b.boundaryCliffs(rect(-29, 29, -80, 56), rockMat, 8);

  // ─── The bamboo itself, in one batch per row so rows can fade ───────
  const stalkGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
  stalkGeometry.translate(0, 0.5, 0);
  const leafGeometry = new THREE.IcosahedronGeometry(1, 0);
  const stalkMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const rows: { x: number; z: number; h: number; r: number }[][] = Array.from({ length: ROWS + 3 }, () => []);
  const r = b.random;

  const wallAlong = (row: number, x0: number, z0: number, x1: number, z1: number) => {
    const length = Math.hypot(x1 - x0, z1 - z0);
    const count = Math.round(length / 0.9);
    const nx = -(z1 - z0) / length;
    const nz = (x1 - x0) / length;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const side = r.range(-0.45, 0.45);
      rows[row].push({ x: x0 + (x1 - x0) * t + nx * side, z: z0 + (z1 - z0) * t + nz * side, h: r.range(4.5, 7), r: r.range(0.07, 0.12) });
    }
    collision.addBox(new THREE.Box3(
      new THREE.Vector3(Math.min(x0, x1) - 0.5, 0, Math.min(z0, z1) - 0.5),
      new THREE.Vector3(Math.max(x0, x1) + 0.5, 8, Math.max(z0, z1) + 0.5),
    ));
  };

  for (let row = 0; row <= ROWS; row++) {
    for (let c = 0; c < COLS; c++) {
      if (!maze.horizontal[row][c]) continue;
      const z = TOP - row * CELL;
      wallAlong(Math.min(row, ROWS - 1), LEFT + c * CELL, z, LEFT + (c + 1) * CELL, z);
    }
  }
  for (let row = 0; row < ROWS; row++) {
    for (let c = 0; c <= COLS; c++) {
      if (!maze.vertical[row][c]) continue;
      const x = LEFT + c * CELL;
      wallAlong(row, x, TOP - row * CELL, x, TOP - (row + 1) * CELL);
    }
  }

  // Groves ringing the entrance and Jorōgumo's clearing
  /** A ring of bamboo; `isGap` leaves openings at the given angles (0 is north, π south). */
  const ring = (row: number, cx: number, cz: number, radius: number, isGap: (a: number) => boolean) => {
    const count = Math.round((Math.PI * 2 * radius) / 0.8);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      if (isGap(a)) continue;
      const x = cx + Math.sin(a) * radius + r.range(-0.5, 0.5);
      const z = cz + Math.cos(a) * radius + r.range(-0.5, 0.5);
      rows[row].push({ x, z, h: r.range(6, 9), r: r.range(0.08, 0.13) });
      if (i % 3 === 0) collision.addSphere(new THREE.Vector3(x, 0, z), 1.3);
    }
  };
  // The entrance clearing opens south into the maze, and north so the camera can see in
  const entryX = cellX(ENTRY_COL);
  ring(ROWS, entryX - 2, 44, 9, a => Math.abs(a - Math.PI) < 0.5 || a < 1.1 || a > Math.PI * 2 - 1.1);
  // The spider's clearing opens north onto the maze's exit, and south to the gate out
  const exitX = cellX(EXIT_COL);
  ring(ROWS + 1, exitX, -54, 15, () => false);
  // Leave gaps where the maze and the gate meet the clearing
  const gapped = rows[ROWS + 1].filter(s => {
    const north = s.z > -54 && Math.abs(s.x - exitX) < 3.4;
    const south = s.z < -54 && Math.abs(s.x - exitX) < 3.4;
    return !north && !south;
  });
  rows[ROWS + 1] = gapped;
  collision.spheres = collision.spheres.filter(sphere => {
    const z = sphere.center.z;
    if (z > -40 || z < -70) return true;
    return Math.abs(sphere.center.x - exitX) > 3.6 || Math.abs(z + 54) < 10;
  });

  const tint = new THREE.Color();
  rows.forEach((stalks, row) => {
    if (stalks.length === 0) return;
    const stalkMesh = new THREE.InstancedMesh(stalkGeometry, stalkMaterial, stalks.length);
    const leafMesh = new THREE.InstancedMesh(leafGeometry, leafMaterial, stalks.length);
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    stalks.forEach((s, i) => {
      q.setFromEuler(new THREE.Euler(r.range(-0.05, 0.05), 0, r.range(-0.05, 0.05)));
      matrix.compose(new THREE.Vector3(s.x, 0, s.z), q, new THREE.Vector3(s.r, s.h, s.r));
      stalkMesh.setMatrixAt(i, matrix);
      stalkMesh.setColorAt(i, tint.setHSL(0.24 + r.range(-0.03, 0.03), 0.42, r.range(0.22, 0.34)));
      const leaf = r.range(0.9, 1.5);
      matrix.compose(new THREE.Vector3(s.x + r.range(-0.4, 0.4), s.h - 0.4, s.z + r.range(-0.4, 0.4)), q, new THREE.Vector3(leaf * 1.3, leaf * 0.6, leaf * 1.3));
      leafMesh.setMatrixAt(i, matrix);
      leafMesh.setColorAt(i, tint.setHSL(0.28 + r.range(-0.04, 0.04), 0.45, r.range(0.12, 0.2)));
    });
    const chunk = new THREE.Group();
    chunk.name = `BambooRow${row}`;
    chunk.add(stalkMesh, leafMesh);
    b.group.add(chunk);
    b.occluders.push(chunk);
  });

  // ─── Guidance and light ─────────────────────────────────────────────
  b.shrine(entryX + 5, 46, -Math.PI / 2);
  b.torii(entryX, 39.5, 0, 0.8);
  maze.path.forEach(([pr, pc], i) => {
    if (i % 4 !== 2) return;
    b.stoneLantern(cellX(pc) + 2.1, cellZ(pr) + 2.1, 0x6aa8ff);
  });
  const clearingZ = -54;
  for (const a of [0.6, 2.2, 3.9, 5.5]) b.stoneLantern(exitX + Math.sin(a) * 11, clearingZ + Math.cos(a) * 11, 0xff6a8a);

  // Webs strung across the clearing's edge
  const silk = new THREE.LineBasicMaterial({ color: 0xd8d8e8, transparent: true, opacity: 0.4 });
  for (const a of [0.3, 1.3, 2.4, 3.9, 4.9, 5.9]) {
    const points: THREE.Vector3[] = [];
    const radius = 3.2;
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2;
      points.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.sin(t) * radius, Math.cos(t) * radius, 0));
    }
    for (let ring = 1; ring <= 4; ring++) {
      for (let i = 0; i < 12; i++) {
        const t0 = (i / 12) * Math.PI * 2;
        const t1 = ((i + 1) / 12) * Math.PI * 2;
        const rr = (ring / 4) * radius;
        points.push(new THREE.Vector3(Math.sin(t0) * rr, Math.cos(t0) * rr, 0), new THREE.Vector3(Math.sin(t1) * rr, Math.cos(t1) * rr, 0));
      }
    }
    const web = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), silk);
    web.position.set(exitX + Math.sin(a) * 13.5, 4, clearingZ + Math.cos(a) * 13.5);
    web.rotation.y = a;
    web.userData.noShadow = true;
    b.group.add(web);
  }
  const exit = b.exitGate(exitX, -71, 0, 0x8affb0);

  // ─── Fights and secrets ─────────────────────────────────────────────
  const pathCell = (fraction: number) => maze.path[Math.min(maze.path.length - 1, Math.floor(maze.path.length * fraction))];
  const fight = (id: string, [row, col]: [number, number], waves: EnemySpawnDef[][], reward: number, extra: Partial<EncounterConfig> = {}): EncounterConfig => ({
    id, center: at(cellX(col), cellZ(row)), activationRadius: 8, leashRadius: 16, reward,
    waves: waves.map((enemies, i) => ({ enemies, delayAfterComplete: i < waves.length - 1 ? 1.2 : 0 })),
    ...extra,
  });
  const encounters: EncounterConfig[] = [
    fight('enc_bamboo_1', pathCell(0.22), [[{ type: 'KAMAITACHI', offset: at(0, -2) }, { type: 'KAMAITACHI', offset: at(1.5, 1.5) }]], 40),
    fight('enc_bamboo_2', pathCell(0.48), [
      [{ type: 'KAMAITACHI', offset: at(-1.5, 0) }, { type: 'LURKING_SHADE', offset: at(1.5, 1) }],
      [{ type: 'KAMAITACHI', offset: at(0, -2) }, { type: 'KAMAITACHI', offset: at(2, 0) }, { type: 'KAMAITACHI', offset: at(-2, 0) }],
    ], 50),
    fight('enc_bamboo_3', pathCell(0.75), [[{ type: 'KAMAITACHI', offset: at(0, -1.5), eliteName: 'The Gale That Cuts' }, { type: 'SHADOW_CALLER', offset: at(1.8, 1.8) }]], 70),
    {
      id: 'enc_bamboo_boss', center: at(exitX, clearingZ), activationRadius: 9, leashRadius: 30, reward: 140,
      waves: [{ enemies: [{ type: 'JOROGUMO', offset: at(0, -7) }], delayAfterComplete: 0 }],
    },
  ];
  // Lurkers wait in a few of the side passages
  const lurkerCells = maze.deadEnds.filter((_, i) => i % 3 === 1).slice(0, 4);
  lurkerCells.forEach(([row, col], i) => {
    encounters.push(fight(`enc_bamboo_lurker_${i}`, [row, col], [[{ type: 'KAMAITACHI_LURKER', offset: at(0, 0) }]], 15, { isOptional: true, activationRadius: 10 }));
  });

  // Secrets in the dead ends farthest from the true path
  const pathSet = maze.path;
  const farthest = [...maze.deadEnds]
    .filter(cell => !lurkerCells.includes(cell))
    .map(cell => ({ cell, d: Math.min(...pathSet.map(p => Math.abs(p[0] - cell[0]) + Math.abs(p[1] - cell[1]))) }))
    .sort((a, b2) => b2.d - a.d);
  const spot = (i: number): [number, number] => {
    const pick = farthest[Math.min(i, farthest.length - 1)]?.cell ?? [6, 0];
    return [cellX(pick[1]), cellZ(pick[0])];
  };
  const [cx0, cz0] = spot(0);
  const [cx1, cz1] = spot(1);
  const [cx2, cz2] = spot(2);
  const secrets: SecretDef[] = [
    { id: 'bamboo_charm', kind: 'charm', charmId: 'spirit_moth', x: cx0, z: cz0 },
    {
      id: 'bamboo_scroll', kind: 'scroll', x: cx1, z: cz1,
      scroll: [
        { id: 'bs_0', speaker: 'Words Cut into a Stalk', text: 'I have walked past this stalk four times. The lanterns are the only thing here that does not move. Follow the blue ones.', next: 'bs_1' },
        { id: 'bs_1', speaker: 'Words Cut into a Stalk', text: 'The weasels laugh in the dark before they cut. If you hear laughing, turn around.' },
      ],
    },
    { id: 'bamboo_cache', kind: 'cache', essence: 90, x: cx2, z: cz2 },
  ];

  b.finish();

  const motes = createMotes(90, 0xb8ff8a, { rise: 0.25, size: 0.12, spread: 16, height: 5 });
  b.group.add(motes.object);

  return {
    group: b.group,
    lights: b.lights,
    occluders: b.occluders,
    spawn: at(entryX - 2, 47),
    bounds: { MIN_X: bounds.minX, MAX_X: bounds.maxX, MIN_Z: bounds.minZ, MAX_Z: bounds.maxZ },
    atmosphere: {
      fogColor: 0x07110b, fogDensity: 0.036, ambientColor: 0x2a4a34, ambientIntensity: 0.5,
      moonIntensity: 0.55, heroLight: { color: 0xffc070, intensity: 26, distance: 15 },
    },
    shrine: { id: 'bamboo_shrine', name: 'Grove Shrine', position: at(entryX + 5, 46), rest: at(entryX + 1.5, 46) },
    exit: at(exitX, -71),
    encounters,
    bossEncounterId: 'enc_bamboo_boss',
    secrets,
    audioZone: 'FOREST',
    groundHeight: b.heightAt,
    footing: b.footingAt,
    update: ctx => {
      b.tick(ctx.time, ctx.dt);
      exit.update(ctx.time);
      exit.setOpen(ctx.isBossDefeated);
      motes.update(ctx.dt, ctx.player.root.position, ctx.time);
    },
    reset: () => {},
    dispose: () => {
      motes.dispose();
      stalkGeometry.dispose();
      leafGeometry.dispose();
      b.dispose();
    },
  };
}
