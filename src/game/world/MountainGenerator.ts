import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';

/** Ranges of peaks ringing the valley. Fog fades them into layered silhouettes. */
export class MountainGenerator {
  public static generate(random: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Mountains';

    const material = new THREE.MeshBasicMaterial({ color: 0x0e1622, fog: true });

    const addPeak = (x: number, z: number, radius: number, height: number) => {
      const geometry = new THREE.ConeGeometry(radius, height, Math.floor(random.range(6, 10)), 3);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        if (positions.getY(i) < height / 2 - 0.01) {
          positions.setX(i, positions.getX(i) + (random.next() - 0.5) * radius * 0.28);
          positions.setZ(i, positions.getZ(i) + (random.next() - 0.5) * radius * 0.28);
        }
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, height / 2 - 8, z);
      mesh.rotation.y = random.next() * Math.PI;
      group.add(mesh);
    };

    // Left and right ranges, in two depth layers
    for (let i = 0; i < 26; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const isFarLayer = i % 4 >= 2;
      const z = random.range(-320, 240);
      addPeak(
        side * (isFarLayer ? random.range(250, 340) : random.range(160, 220)),
        z,
        random.range(55, 95),
        isFarLayer ? random.range(150, 230) : random.range(90, 150),
      );
    }

    // Behind the arena, and behind the entrance
    for (let i = 0; i < 14; i++) {
      const x = random.range(-300, 300);
      const isBehindArena = i % 2 === 0;
      addPeak(
        x,
        isBehindArena ? random.range(-420, -300) : random.range(260, 360),
        random.range(60, 110),
        random.range(120, 240),
      );
    }

    return group;
  }
}
