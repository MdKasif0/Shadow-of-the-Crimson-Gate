import * as THREE from 'three';
import { SeededRandom, smoothstep } from '../utils/MathUtils';
import { noise2D } from '../utils/Noise';
import { createSurfaceTextures } from '../utils/ProceduralTextures';

const TERRAIN_MIN_X = -130;
const TERRAIN_MAX_X = 130;
const TERRAIN_MIN_Z = -250;
const TERRAIN_MAX_Z = 160;

/** Tiles of the detail texture per world unit. */
const TEXTURE_SCALE = 0.11;

const color = new THREE.Color();
const tint = new THREE.Color();

export class TerrainGenerator {
  /**
   * Ground height at a point. The playable valley stays at y≈0 because characters
   * walk on a flat plane, while the land rises into hills beyond it on all sides.
   */
  public static heightAt(x: number, z: number): number {
    const distFromCenter = Math.abs(x);
    const rolling = noise2D(x * 0.035 + 11, z * 0.035 + 7) * 1.5 + noise2D(x * 0.11 + 3, z * 0.11 + 9) * 0.35;

    // Arena courtyard has its own floor, so the ground stays beneath it
    if (distFromCenter < 22 && z < -93.5 && z > -136.5) return -0.8;

    // Valley floor only dips, so feet never sink into it
    const floor = Math.min((rolling - 0.75) * 0.14, 0) - 0.03;

    const sideRise = smoothstep(28, 70, distFromCenter);
    const backRise = smoothstep(-142, -200, z);
    const frontRise = smoothstep(62, 110, z);
    const rise = Math.max(sideRise, backRise, frontRise);

    return floor + rise * (rise * 26 + rolling * 3.5 + noise2D(x * 0.02, z * 0.02) * 7);
  }

  public static generate(_random: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Terrain';

    const width = TERRAIN_MAX_X - TERRAIN_MIN_X;
    const depth = TERRAIN_MAX_Z - TERRAIN_MIN_Z;
    const geometry = new THREE.PlaneGeometry(width, depth, 165, 260);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate((TERRAIN_MIN_X + TERRAIN_MAX_X) / 2, 0, (TERRAIN_MIN_Z + TERRAIN_MAX_Z) / 2);

    const positions = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    const colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const height = this.heightAt(x, z);
      positions.setY(i, height);
      uvs.setXY(i, x * TEXTURE_SCALE, z * TEXTURE_SCALE);

      this.groundColor(x, z, height);
      colors.set([color.r, color.g, color.b], i * 3);
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const { map, normalMap } = createSurfaceTextures([8, 16, 32, 64, 128], 4711, 5);
    const material = new THREE.MeshStandardMaterial({
      map,
      normalMap,
      vertexColors: true,
      roughness: 0.96,
      metalness: 0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'Ground';
    mesh.receiveShadow = true;
    group.add(mesh);

    return group;
  }

  /** Paints soil, moss and dirt per zone into the shared `color`. */
  private static groundColor(x: number, z: number, height: number): void {
    const patch = noise2D(x * 0.09 + 40, z * 0.09 - 12);
    const fine = noise2D(x * 0.4, z * 0.4);

    if (z > -5) {
      color.setHex(0x3d4a35); // Courtyard moss
      color.lerp(tint.setHex(0x4a3f3a), THREE.MathUtils.clamp(patch + 0.3, 0, 1));
    } else if (z > -22) {
      color.setHex(0x34493c); // Shrine clearing
      color.lerp(tint.setHex(0x3d3a33), THREE.MathUtils.clamp(patch + 0.2, 0, 1));
    } else if (z > -55) {
      color.setHex(0x213029); // Forest floor
      color.lerp(tint.setHex(0x2b2520), THREE.MathUtils.clamp(patch + 0.4, 0, 1));
    } else {
      color.setHex(0x3a3238); // Blighted temple ground
      color.lerp(tint.setHex(0x34262a), THREE.MathUtils.clamp(patch + 0.3, 0, 1));
    }
    color.multiplyScalar(0.92 + fine * 0.16);

    // Worn dirt either side of the stone path
    const pathDist = Math.abs(x - TerrainGenerator.pathOffset(z));
    if (z < 60 && z > -92) {
      color.lerp(tint.setHex(0x4f463c), (1 - smoothstep(2, 5.5, pathDist)) * 0.75);
    }

    // Hills fall away to darker, cooler tones
    color.lerp(tint.setHex(0x1b2428), smoothstep(1, 16, height) * 0.8);
  }

  /** The gentle curve of the stone path, shared with PathGenerator. */
  public static pathOffset(z: number): number {
    // Runs straight where it passes through gates, which sit at x=0
    const gateFade = smoothstep(52, 44, z) * smoothstep(-48, -38, z);
    return Math.sin(z * 0.09) * 1.1 * gateFade;
  }
}
