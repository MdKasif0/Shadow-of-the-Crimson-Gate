import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';
import { LevelBuilder, std } from './LevelKit';
import { LevelRuntime, Rect } from './LevelTypes';
import { createMotes } from './LevelEffects';
import { SecretDef } from '../world/WorldSecrets';
import { EncounterConfig, EnemySpawnDef } from '../encounters/EncounterConfig';
import { SeededRandom } from '../utils/MathUtils';
import { BambooGrove, Culm } from '../world/BambooGrove';

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
  /** The cells you can step to from this one. */
  open: (r: number, c: number) => [number, number][];
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
  return { horizontal, vertical, path, deadEnds, open };
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

  b.ground(bounds, 0x1c2418, 0x2a3220, 11, {
    mud: 0x2a2418, moss: 0x24341c, stone: 0x3a3c36, ash: 0x1a1a16, amount: { moss: 1, stone: 0.25, ash: 0 },
  });
  const rockMat = std(0x2a2e28, { roughness: 1, flatShading: true });
  b.boundaryCliffs(rect(-29, 29, -80, 56), rockMat, 8);

  // ─── The bamboo itself: clumps, in one batch per row so rows can fade ─
  const grove = new BambooGrove(b.random);
  const rows: Culm[][] = Array.from({ length: ROWS + 3 }, () => []);
  const r = b.random;

  /** A wall of bamboo between two points: clumps at uneven spacing, through a band, never a line. */
  const wallAlong = (row: number, x0: number, z0: number, x1: number, z1: number) => {
    const length = Math.hypot(x1 - x0, z1 - z0);
    const nx = -(z1 - z0) / length;
    const nz = (x1 - x0) / length;
    for (let d = r.range(0, 0.5); d <= length + 0.3; d += r.range(0.75, 1.5)) {
      const t = Math.min(1, d / length);
      const side = r.range(-0.6, 0.6);
      const x = x0 + (x1 - x0) * t + nx * side;
      const z = z0 + (z1 - z0) * t + nz * side;
      grove.clump(rows[row], x, z, { away: [nx * Math.sign(side || 1), nz * Math.sign(side || 1)] });
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
    const circumference = Math.PI * 2 * radius;
    let placed = 0;
    for (let d = 0; d < circumference; d += r.range(0.9, 1.6)) {
      const a = (d / circumference) * Math.PI * 2;
      if (isGap(a)) continue;
      const out = r.range(-0.4, 0.9);
      const x = cx + Math.sin(a) * (radius + out);
      const z = cz + Math.cos(a) * (radius + out);
      grove.clump(rows[row], x, z, { away: [Math.sin(a), Math.cos(a)], tall: [8, 12] });
      if (placed++ % 2 === 0) collision.addSphere(new THREE.Vector3(cx + Math.sin(a) * radius, 0, cz + Math.cos(a) * radius), 1.4);
    }
  };
  // The entrance clearing opens south into the maze, and north so the camera can see in
  const entryX = cellX(ENTRY_COL);
  ring(ROWS, entryX - 2, 44, 9, a => Math.abs(a - Math.PI) < 0.5 || a < 1.1 || a > Math.PI * 2 - 1.1);
  // The spider's clearing opens north onto the maze's exit, and south to the gate out
  const exitX = cellX(EXIT_COL);
  ring(ROWS + 1, exitX, -54, 15, () => false);
  // Leave gaps where the maze and the gate meet the clearing
  rows[ROWS + 1] = rows[ROWS + 1].filter(s => {
    const north = s.z > -54 && Math.abs(s.x - exitX) < 3.6;
    const south = s.z < -54 && Math.abs(s.x - exitX) < 3.6;
    return !north && !south;
  });
  collision.spheres = collision.spheres.filter(sphere => {
    const z = sphere.center.z;
    if (z > -40 || z < -70) return true;
    return Math.abs(sphere.center.x - exitX) > 3.6 || Math.abs(z + 54) < 10;
  });

  rows.forEach((culms, row) => {
    if (culms.length === 0) return;
    const chunk = grove.build(culms, `BambooRow${row}`);
    b.group.add(chunk);
    b.occluders.push(chunk);
  });

  // Shoots coming up at the feet of the walls, and dry leaves over everything
  const allCulms = rows.flat();
  const shootSpots: [number, number][] = [];
  for (let i = 0; i < 420; i++) {
    const c = allCulms[Math.floor(r.next() * allCulms.length)];
    shootSpots.push([c.x + r.range(-1.1, 1.1), c.z + r.range(-1.1, 1.1)]);
  }
  b.group.add(grove.shoots(shootSpots));
  const litterSpots: [number, number][] = [];
  for (let i = 0; i < 1400; i++) litterSpots.push([r.range(bounds.minX, bounds.maxX), r.range(bounds.minZ, bounds.maxZ)]);
  b.group.add(grove.litter(litterSpots));

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

  // Moonlight falling through gaps in the canopy, along the true path and over the clearing
  const beams = b.shafts({ color: 0xb8e8b0, opacity: 0.55, width: [1.2, 2.6], length: 18 });
  maze.path.forEach(([pr, pc], i) => {
    if (i % 3 === 0) beams.add(new THREE.Vector3(cellX(pc) + r.range(-1.5, 1.5), 0, cellZ(pr) + r.range(-1.5, 1.5)), () => r.next());
  });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    beams.add(new THREE.Vector3(exitX + Math.sin(a) * 7, 0, clearingZ + Math.cos(a) * 7), () => r.next());
  }

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

  b.grass(bounds, 5000, { colors: [0x3a5a26, 0x6a7a34], height: [0.3, 0.7] });
  b.banner(entryX - 4, 41, 4.4, 0x2a4a2a, { rotY: 0.3, mark: 0xd8d0b0 });
  b.banner(entryX + 4, 41, 4.4, 0x2a4a2a, { rotY: -0.3, mark: 0xd8d0b0 });

  b.finish();

  // ─── The way through, from wherever you stand ─────────────────────
  const mazeBottom = TOP - ROWS * CELL;
  const bossPoint = at(exitX, clearingZ);
  const gatePoint = at(exitX, -71);
  let cachedFrom = '';
  let cachedCells: THREE.Vector3[] = [];
  /** The shortest way from a cell to the maze's exit, through open passages only. */
  const cellsToExit = (start: [number, number]): THREE.Vector3[] => {
    const key = `${start[0]},${start[1]}`;
    if (key === cachedFrom) return cachedCells;
    const previous = new Map<string, string | null>([[key, null]]);
    const queue: [number, number][] = [start];
    const goal = `${ROWS - 1},${EXIT_COL}`;
    while (queue.length > 0) {
      const [cr, cc] = queue.shift()!;
      if (`${cr},${cc}` === goal) break;
      for (const [nr, nc] of maze.open(cr, cc)) {
        const k = `${nr},${nc}`;
        if (previous.has(k)) continue;
        previous.set(k, `${cr},${cc}`);
        queue.push([nr, nc]);
      }
    }
    const cells: THREE.Vector3[] = [];
    let step: string | null | undefined = goal;
    while (step) {
      const [cr, cc] = step.split(',').map(Number);
      cells.unshift(at(cellX(cc), cellZ(cr)));
      step = previous.get(step);
    }
    cachedFrom = key;
    cachedCells = previous.has(goal) ? cells : [];
    return cachedCells;
  };
  const guide = (from: THREE.Vector3, isBossDefeated: boolean): THREE.Vector3[] => {
    const end = isBossDefeated ? [bossPoint, gatePoint] : [bossPoint];
    const out = at(cellX(EXIT_COL), mazeBottom - 1.5);
    if (from.z < mazeBottom) return [from.clone(), ...end];
    if (from.z > TOP) {
      // Still in the entrance clearing: to the way in, then through
      return [from.clone(), at(cellX(ENTRY_COL), TOP + 1.5), ...cellsToExit([0, ENTRY_COL]), out, ...end];
    }
    const row = THREE.MathUtils.clamp(Math.floor((TOP - from.z) / CELL), 0, ROWS - 1);
    const col = THREE.MathUtils.clamp(Math.floor((from.x - LEFT) / CELL), 0, COLS - 1);
    const cells = cellsToExit([row, col]);
    // Skip the centre of the cell you're already in once you're past it
    const rest = cells.length > 1 && from.distanceTo(cells[1]) < cells[0].distanceTo(cells[1]) ? cells.slice(1) : cells;
    return [from.clone(), ...rest, out, ...end];
  };

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
      moonIntensity: 0.55, cloudiness: 0.3, heroLight: { color: 0xffc070, intensity: 26, distance: 15 },
    },
    shrine: { id: 'bamboo_shrine', name: 'Grove Shrine', position: at(entryX + 5, 46), rest: at(entryX + 1.5, 46) },
    exit: at(exitX, -71),
    encounters,
    bossEncounterId: 'enc_bamboo_boss',
    secrets,
    audioZone: 'FOREST',
    groundHeight: b.heightAt,
    footing: b.footingAt,
    map: b.mapData(),
    guide,
    haunt: { color: 0x7affc4, tint: 0x6a8a7a, extra: 'none' },
    update: ctx => {
      b.tick(ctx.time, ctx.dt, ctx.camera.camera);
      exit.update(ctx.time);
      exit.setOpen(ctx.isBossDefeated);
      motes.update(ctx.dt, ctx.player.root.position, ctx.time);
    },
    reset: () => {},
    dispose: () => {
      motes.dispose();
      grove.dispose();
      b.dispose();
    },
  };
}
