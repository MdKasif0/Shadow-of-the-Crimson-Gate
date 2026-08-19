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
    const segments = 60;

    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Noise for height
      const nx = x * 0.05 + random.next() * 10;
      const nz = z * 0.05 + random.next() * 10;
      let height = noise2D(nx, nz) * 2;

      // Keep center flat (mask)
      const distFromCenter = Math.sqrt(x * x + z * z);
      const flattenMask = smoothstep(5, 25, distFromCenter);
      height *= flattenMask;

      // Lower back for temple
      if (z < -10 && Math.abs(x) < 15) {
        height = 0; 
      }

      positions.setY(i, height);

      // Procedural vertex colors
      // Base: dark charcoal earth with blue-green tint
      color.setHex(0x1a2228); 
      // Add variation based on height and noise
      const colorNoise = noise2D(x * 0.2, z * 0.2);
      if (colorNoise > 0) {
        color.lerp(new THREE.Color(0x11161a), colorNoise); // darker pockets
      } else {
        color.lerp(new THREE.Color(0x2a353a), -colorNoise); // lighter highlights
      }

      // Stone path to temple
      if (Math.abs(x) < 2 + noise2D(z * 0.2, 0) && z < 20 && z > -15) {
        // Path color
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
