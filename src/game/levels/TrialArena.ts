import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';
import { LevelBuilder, std } from './LevelKit';
import { LevelRuntime } from './LevelTypes';
import { createMotes } from './LevelEffects';

const RADIUS = 24;

/**
 * The Trial Arena — A ring of stone on a mountaintop, walled by torii, for
 * Boss Rush and the endless Arena. Not part of the journey, and not on the map.
 */
export function buildTrialArena(collision: CollisionSystem): LevelRuntime {
  const b = new LevelBuilder('TrialArena', collision, 6061);
  const stone = std(0x3a3438, { roughness: 0.9, flatShading: true });
  const paving = std(0x4a4248, { roughness: 0.85 });
  const cliff = std(0x221c22, { roughness: 1, flatShading: true });

  b.ground({ minX: -40, maxX: 40, minZ: -40, maxZ: 40 }, 0x2a2026, 0x3a2a30, 51);
  const floor = b.mesh(new THREE.CylinderGeometry(RADIUS, RADIUS + 0.6, 0.3, 48), paving, 0, 0.15, 0);
  floor.receiveShadow = true;
  b.raise({ minX: -RADIUS, maxX: RADIUS, minZ: -RADIUS, maxZ: RADIUS }, 0.3);
  for (let ring = 1; ring <= 3; ring++) {
    const r = (ring / 3.4) * RADIUS;
    const line = b.mesh(new THREE.TorusGeometry(r, 0.06, 4, 64), std(0x1a1418), 0, 0.31, 0);
    line.rotation.x = Math.PI / 2;
  }

  // A wall of standing stones and eight torii around the edge
  const count = 40;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = Math.sin(a) * (RADIUS + 1.5);
    const z = Math.cos(a) * (RADIUS + 1.5);
    if (i % 5 === 0) {
      b.torii(x, z, a, 0.7);
    } else {
      const height = b.random.range(2.2, 3.6);
      const pillar = b.box(x, z, 1.4, height, 1.1, stone);
      pillar.rotation.y = a;
      b.pillar(x, z, 1.1);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    b.stoneLantern(Math.sin(a) * (RADIUS - 3), Math.cos(a) * (RADIUS - 3), 0xff5a4a);
  }
  b.boundaryCliffs({ minX: -36, maxX: 36, minZ: -36, maxZ: 36 }, cliff, 10);
  const beams = b.shafts({ color: 0xff7a8a, opacity: 0.26, width: [2, 3.5], length: 20 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    beams.add(new THREE.Vector3(Math.sin(a) * 12, 0.3, Math.cos(a) * 12), () => b.random.next());
  }
  b.finish();

  const motes = createMotes(80, 0xff6a5a, { rise: 0.7, size: 0.13, spread: 20, height: 9 });
  b.group.add(motes.object);
  const away = new THREE.Vector3(0, 0, 999);

  return {
    group: b.group,
    lights: b.lights,
    occluders: b.occluders,
    spawn: new THREE.Vector3(0, 0, 14),
    bounds: { MIN_X: -RADIUS + 1, MAX_X: RADIUS - 1, MIN_Z: -RADIUS + 1, MAX_Z: RADIUS - 1 },
    atmosphere: { fogColor: 0x24080e, fogDensity: 0.012, ambientColor: 0x8a3a4a, ambientIntensity: 1.4, moonIntensity: 2 },
    // No rest and no way out but victory or defeat
    shrine: { id: 'arena_shrine', name: 'Arena', position: away, rest: away },
    exit: away,
    encounters: [],
    bossEncounterId: 'none',
    secrets: [],
    audioZone: 'BOSS_ARENA',
    groundHeight: b.heightAt,
    footing: b.footingAt,
    update: ctx => {
      b.tick(ctx.time, ctx.dt, ctx.camera.camera);
      motes.update(ctx.dt, ctx.player.root.position, ctx.time);
    },
    reset: () => {},
    dispose: () => {
      motes.dispose();
      b.dispose();
    },
  };
}
