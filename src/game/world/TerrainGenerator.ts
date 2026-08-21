import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { noise2D } from '../utils/Noise';
import { GAME_CONFIG } from '../GameConfig';
import { smoothstep } from '../utils/MathUtils';

export class TerrainGenerator {
  public static generate(random: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Terrain';

    const width = GAME_CONFIG.WORLD.WIDTH;
    const depth = GAME_CONFIG.WORLD.DEPTH;
    const segX = 60;
    const segZ = Math.floor(60 * (depth / 60)); // Scale segments with depth

    const geometry = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0, -40); // Align with bounds: -140 to 60

    const positions = geometry.attributes.position;
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Noise for height
      const nx = x * 0.05 + random.next() * 10;
      const nz = z * 0.05 + random.next() * 10;
      let height = noise2D(nx, nz) * 2;

      // === ZONE-BASED FLATTEN MASKS ===
      
      // Entrance zone (z: 40-60) — flat path
      if (z > 35) {
        const flatMask = smoothstep(40, 55, z);
        if (Math.abs(x) < 6) height *= (1 - flatMask);
      }

      // Courtyard center (z: 0-40) — keep mostly flat center
      if (z > -5 && z < 45) {
        const distFromPath = Math.abs(x);
        const courtFlatten = smoothstep(3, 20, distFromPath);
        height *= courtFlatten;
      }

      // Shrine area (z: -20 to 0) — flat clearing
      if (z > -25 && z < 5 && Math.abs(x) < 12) {
        height *= smoothstep(5, 15, Math.abs(x));
      }

      // Forest path (z: -50 to -20) — rolling but walkable center
      if (z > -55 && z < -15) {
        if (Math.abs(x) < 5) {
          height *= 0.3; // Flatten the path
        }
        // Raise sides slightly for enclosed feel
        if (Math.abs(x) > 15) {
          height += Math.abs(x) * 0.05;
        }
      }

      // Temple approach (z: -80 to -50) — flat for temple
      if (z < -45 && Math.abs(x) < 16) {
        height *= smoothstep(-60, -45, z);
      }

      positions.setY(i, height);

      // === ZONE-BASED VERTEX COLORS ===
      // Default: dark charcoal
      color.setHex(0x1a2228);
      const colorNoise = noise2D(x * 0.2, z * 0.2);

      if (z > 35) {
        // Entrance: lighter stone
        color.setHex(0x222a33);
        color.lerp(new THREE.Color(0x2a353a), Math.abs(colorNoise));
      } else if (z > -5) {
        // Courtyard: standard
        if (colorNoise > 0) {
          color.lerp(new THREE.Color(0x11161a), colorNoise);
        } else {
          color.lerp(new THREE.Color(0x2a353a), -colorNoise);
        }
      } else if (z > -25) {
        // Shrine: slightly mossy/green tint
        color.setHex(0x1a2520);
        color.lerp(new THREE.Color(0x15201a), Math.abs(colorNoise));
      } else if (z > -55) {
        // Forest: darker, more brown
        color.setHex(0x151a18);
        color.lerp(new THREE.Color(0x0f1410), Math.abs(colorNoise));
      } else {
        // Temple approach: stone-like
        color.setHex(0x1e2530);
        color.lerp(new THREE.Color(0x222830), Math.abs(colorNoise));
      }

      // Stone path running through center
      const pathWidth = 2 + noise2D(z * 0.2, 0) * 0.5;
      if (Math.abs(x) < pathWidth && z < 55 && z > -75) {
        color.lerp(new THREE.Color(0x333b44), 0.7 + noise2D(x * 0.5, z * 0.5) * 0.3);
      }

      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    group.add(mesh);

    return group;
  }
}
