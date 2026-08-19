import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { GAME_CONFIG } from '../GameConfig';

export class MountainGenerator {
  public static generate(random: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Mountains';

    const material = new THREE.MeshBasicMaterial({ 
      color: 0x0a111a, 
      fog: true // Crucial: let them fade into fog naturally
    });

    const mtnCount = 12;
    const radius = GAME_CONFIG.WORLD.WIDTH * 0.8;

    for (let i = 0; i < mtnCount; i++) {
      // Create jagged low-poly mountains
      const segments = Math.floor(random.range(4, 7));
      const geo = new THREE.ConeGeometry(random.range(15, 30), random.range(20, 45), segments);
      
      // Jitter vertices
      const pos = geo.attributes.position;
      for(let j=0; j<pos.count; j++) {
        if (pos.getY(j) > 0) {
          pos.setX(j, pos.getX(j) + (random.next() - 0.5) * 5);
          pos.setZ(j, pos.getZ(j) + (random.next() - 0.5) * 5);
        }
      }
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, material);
      
      // Place in a semi-circle behind the temple
      const angle = Math.PI + (random.next() - 0.5) * Math.PI * 1.5; // Back half
      
      mesh.position.set(
        Math.cos(angle) * radius,
        -5, // sink them slightly
        Math.sin(angle) * radius - 15 // push them back
      );
      
      mesh.rotation.y = random.next() * Math.PI;

      group.add(mesh);
    }

    return group;
  }
}
