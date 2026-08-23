import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';

export class WispGenerator {
  public static generate(random: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Wisps';

    const wispCount = 80;
    const wispGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const wispMat = new THREE.MeshBasicMaterial({ 
      color: 0x44ffff, 
      transparent: true, 
      opacity: 0.8,
      blending: THREE.AdditiveBlending 
    });

    for (let i = 0; i < wispCount; i++) {
      // Scatter primarily in the FOREST zone (z: -50 to -20)
      const x = (random.next() - 0.5) * 40;
      const z = -20 - random.next() * 30; 
      const y = 1.0 + random.next() * 3.0; // Floating height

      const wisp = new THREE.Mesh(wispGeo, wispMat);
      wisp.position.set(x, y, z);
      
      // Add a subtle point light to some wisps to cast eerie blue glow on trees/ground
      if (random.next() > 0.5) {
        const light = new THREE.PointLight(0x44ffff, 0.4, 6);
        light.position.set(0, 0, 0);
        wisp.add(light);
      }
      
      // Store random phase for animation in userData
      wisp.userData.phaseOffset = random.next() * Math.PI * 2;
      wisp.userData.speed = 0.5 + random.next() * 0.5;
      wisp.userData.baseY = y;

      group.add(wisp);
    }

    return group;
  }

  // Called in GameScene update to animate the wisps bobbing
  public static update(group: THREE.Group, time: number): void {
    group.children.forEach(wisp => {
      const phase = wisp.userData.phaseOffset + time * wisp.userData.speed;
      wisp.position.y = wisp.userData.baseY + Math.sin(phase) * 0.5;
    });
  }
}
