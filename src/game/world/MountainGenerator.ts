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

    const mtnCount = 24; // Increased for longer level

    for (let i = 0; i < mtnCount; i++) {
      // Create jagged low-poly mountains
      const segments = Math.floor(random.range(4, 7));
      const geo = new THREE.ConeGeometry(random.range(15, 35), random.range(25, 60), segments);
      
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
      
      // Place around the perimeter
      const isSide = random.next() > 0.3;
      let mx, mz;
      
      if (isSide) {
        // Place along the sides (X = ±40 to ±60, Z = -90 to 70)
        const side = random.next() > 0.5 ? 1 : -1;
        mx = side * random.range(35, 60);
        mz = random.range(-90, 70);
      } else {
        // Place at the very back behind temple (Z = -90 to -120)
        mx = random.range(-40, 40);
        mz = random.range(-90, -120);
      }
      
      mesh.position.set(mx, -5, mz);
      
      mesh.rotation.y = random.next() * Math.PI;

      group.add(mesh);
    }

    return group;
  }
}
