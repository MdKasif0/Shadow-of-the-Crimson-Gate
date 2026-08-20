import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';

export class ToriiGenerator {
  public static generate(collisionSystem: CollisionSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Torii';

    const crimsonMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.6, metalness: 0.1 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });

    // Pillars
    const height = 8;
    const radius = 0.5;
    const separation = 7;

    for (const sign of [-1, 1]) {
      // Main pillar
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius, height, 12), crimsonMat);
      pillar.position.set(sign * (separation / 2), height / 2, 0);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);

      // Black base
      const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.1, radius * 1.2, 0.5, 12), blackMat);
      base.position.set(sign * (separation / 2), 0.25, 0);
      group.add(base);
    }

    // Lower crossbeam (Nuki)
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(separation + 2, 0.6, 0.6), crimsonMat);
    nuki.position.set(0, height * 0.65, 0);
    nuki.castShadow = true;
    group.add(nuki);

    // Upper crossbeam (Kasagi) - curved using ExtrudeGeometry along a curve
    class KasagiCurve extends THREE.Curve<THREE.Vector3> {
      constructor() {
        super();
      }
      getPoint(t: number, optionalTarget = new THREE.Vector3()) {
        const x = (t - 0.5) * (separation + 4);
        const y = Math.pow(Math.abs(t - 0.5) * 2, 2) * 0.5; // Upward curve at ends
        return optionalTarget.set(x, y, 0);
      }
    }

    const path = new KasagiCurve();
    const shape = new THREE.Shape();
    shape.moveTo(-0.6, 0.4);
    shape.lineTo(0.6, 0.4);
    shape.lineTo(0.5, -0.4);
    shape.lineTo(-0.5, -0.4);
    shape.lineTo(-0.6, 0.4);

    const kasagiGeo = new THREE.ExtrudeGeometry(shape, {
      steps: 20,
      extrudePath: path,
      bevelEnabled: false,
    });
    
    const kasagi = new THREE.Mesh(kasagiGeo, blackMat);
    kasagi.position.set(0, height - 0.2, 0);
    kasagi.castShadow = true;
    group.add(kasagi);

    // Center strut (Gaku-zuka)
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.8, height * 0.35, 0.5), crimsonMat);
    strut.position.set(0, height * 0.8, 0);
    group.add(strut);

    // Nameplate
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.7), blackMat);
    plate.position.set(0, height * 0.8, 0.1);
    group.add(plate);

    // Register collision for the two pillars (assuming torii is placed at 0,0,15 later, we can't easily add global bounds here unless we know its global position, OR we can add them in GameScene. But wait, ToriiGenerator is generic. It doesn't know its final position!
    // Wait, in WorldGenerator, Torii is moved to (0,0,15) AFTER generate is called.
    // I should register them in WorldGenerator or pass the position, or just hardcode the world positions here since this is a specific one-off map.)
    return group;
  }
}
