import * as THREE from 'three';

// ─── Geometry Helpers ────────────────────────────────────────────────────────

/** Create a beveled box (chamfered edges) */
export function createBeveledBox(w: number, h: number, d: number, bevel: number = 0.02): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = w / 2 - bevel; const hh = h / 2 - bevel;
  shape.moveTo(-hw, -h / 2);
  shape.lineTo(hw, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -hh);
  shape.lineTo(w / 2, hh);
  shape.quadraticCurveTo(w / 2, h / 2, hw, h / 2);
  shape.lineTo(-hw, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, hh);
  shape.lineTo(-w / 2, -hh);
  shape.quadraticCurveTo(-w / 2, -h / 2, -hw, -h / 2);
  return new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
}

/** Deform an icosahedron into an organic rock shape */
export function createRockGeometry(radius: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  const pos = geo.attributes.position;
  let s = seed;
  for (let i = 0; i < pos.count; i++) {
    s = (s * 16807) % 2147483647;
    const noise = ((s - 1) / 2147483646) * 0.4 + 0.8;
    const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
    // Flatten bottom
    const flatY = y < 0 ? y * 0.3 : y;
    pos.setXYZ(i, x * noise, flatY * noise, z * noise);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Create a curved Japanese roof shape */
export function createCurvedRoofGeometry(width: number, depth: number, height: number, segments: number = 8): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = width / 2 * 1.15; // Overhang
  shape.moveTo(-hw, 0);
  shape.quadraticCurveTo(-hw * 0.5, height * 1.2, 0, height);
  shape.quadraticCurveTo(hw * 0.5, height * 1.2, hw, 0);
  shape.lineTo(-hw, 0);
  return new THREE.ExtrudeGeometry(shape, {
    depth: depth * 1.15, bevelEnabled: false, steps: segments,
  });
}
