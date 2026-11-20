import * as THREE from 'three';

/**
 * LevelEffects — Weather and air for the later levels: rain, embers, drifting
 * spirit lights and gusts of wind. Each keeps a box of particles centred on
 * the player, recycling them as they leave it.
 */

interface Effect {
  object: THREE.Object3D;
  update: (dt: number, center: THREE.Vector3, time: number) => void;
  dispose: () => void;
}

/** Slanting streaks of rain. */
export function createRain(count = 1400, color = 0x9ab8d8): Effect {
  const half = { x: 22, y: 14, z: 22 };
  const positions = new Float32Array(count * 6);
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = (Math.random() * 2 - 1) * half.x;
    seeds[i * 3 + 1] = Math.random() * half.y * 2;
    seeds[i * 3 + 2] = (Math.random() * 2 - 1) * half.z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.38, depthWrite: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  const slant = new THREE.Vector3(0.18, -1, 0.08).normalize();

  return {
    object: lines,
    update: (dt, center) => {
      for (let i = 0; i < count; i++) {
        let y = seeds[i * 3 + 1] - dt * 24;
        if (y < 0) y += half.y * 2;
        seeds[i * 3 + 1] = y;
        const x = center.x + seeds[i * 3] + (y - half.y) * slant.x * -1;
        const z = center.z + seeds[i * 3 + 2];
        const top = y;
        positions[i * 6] = x;
        positions[i * 6 + 1] = top;
        positions[i * 6 + 2] = z;
        positions[i * 6 + 3] = x + slant.x * 0.7;
        positions[i * 6 + 4] = top + slant.y * 0.7;
        positions[i * 6 + 5] = z + slant.z * 0.7;
      }
      geometry.attributes.position.needsUpdate = true;
    },
    dispose: () => { geometry.dispose(); material.dispose(); },
  };
}

/** Points of light that rise, drift and wink: embers over fire, or spirits in the dark. */
export function createMotes(count: number, color: number, options: { rise: number; size: number; spread: number; height: number }): Effect {
  const positions = new Float32Array(count * 3);
  const seeds = Array.from({ length: count }, () => ({
    x: (Math.random() * 2 - 1) * options.spread,
    y: Math.random() * options.height,
    z: (Math.random() * 2 - 1) * options.spread,
    phase: Math.random() * Math.PI * 2,
    speed: 0.6 + Math.random() * 0.8,
  }));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color, size: options.size, transparent: true, opacity: 0.85, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    object: points,
    update: (dt, center, time) => {
      seeds.forEach((seed, i) => {
        seed.y += dt * options.rise * seed.speed;
        if (seed.y > options.height) seed.y -= options.height;
        if (seed.y < 0) seed.y += options.height;
        positions[i * 3] = center.x + seed.x + Math.sin(time * seed.speed + seed.phase) * 0.6;
        positions[i * 3 + 1] = seed.y;
        positions[i * 3 + 2] = center.z + seed.z + Math.cos(time * seed.speed * 0.8 + seed.phase) * 0.6;
      });
      material.opacity = 0.65 + Math.sin(time * 3) * 0.2;
      geometry.attributes.position.needsUpdate = true;
    },
    dispose: () => { geometry.dispose(); material.dispose(); },
  };
}

/** Streaks along the wind, brighter while a gust blows. Set `strength` from 0 to 1 each frame. */
export function createWindStreaks(count = 160): Effect & { direction: THREE.Vector3; strength: number } {
  const half = 20;
  const positions = new Float32Array(count * 6);
  const seeds = Array.from({ length: count }, () => ({
    x: (Math.random() * 2 - 1) * half, y: 0.3 + Math.random() * 5, z: (Math.random() * 2 - 1) * half, length: 1.5 + Math.random() * 2.5,
  }));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xd8e4f0, transparent: true, opacity: 0, depthWrite: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  const effect = {
    object: lines,
    direction: new THREE.Vector3(1, 0, 0),
    strength: 0,
    update: (dt: number, center: THREE.Vector3) => {
      const speed = 10 + effect.strength * 30;
      const d = effect.direction;
      for (let i = 0; i < count; i++) {
        const seed = seeds[i];
        seed.x += d.x * speed * dt;
        seed.z += d.z * speed * dt;
        if (seed.x > half) seed.x -= half * 2;
        if (seed.x < -half) seed.x += half * 2;
        if (seed.z > half) seed.z -= half * 2;
        if (seed.z < -half) seed.z += half * 2;
        const x = center.x + seed.x;
        const z = center.z + seed.z;
        positions.set([x, seed.y, z, x - d.x * seed.length, seed.y, z - d.z * seed.length], i * 6);
      }
      material.opacity = 0.05 + effect.strength * 0.4;
      geometry.attributes.position.needsUpdate = true;
    },
    dispose: () => { geometry.dispose(); material.dispose(); },
  };
  return effect;
}
