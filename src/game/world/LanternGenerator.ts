import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { CollisionSystem } from '../collision/CollisionSystem';
import { createGlowSprite, createLightPool, WorldLights } from '../lighting/WorldLights';
import { TerrainGenerator } from './TerrainGenerator';

const LANTERN_COLOR = 0xffa24a;
const LANTERN_CORE_HEIGHT = 2.5;

export class LanternGenerator {
  public static generate(random: SeededRandom, collisionSystem: CollisionSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Lanterns';

    const prefab = this.generateSingle();

    const place = (x: number, z: number) => {
      const scale = random.range(0.85, 1.05);
      const lantern = prefab.clone();
      lantern.position.set(x, 0, z);
      lantern.scale.setScalar(scale);
      lantern.rotation.y = random.next() * Math.PI / 2;
      group.add(lantern);

      collisionSystem.addSphere(new THREE.Vector3(x, 0, z), 0.75 * scale);
      WorldLights.add(x, LANTERN_CORE_HEIGHT * scale, z, LANTERN_COLOR, 32, 17);
    };

    // Paired lanterns stepping along the path, leading the eye towards the temple
    for (let z = 48; z > -50; z -= 15) {
      const center = TerrainGenerator.pathOffset(z);
      // Leave room for the main shrine and for the courtyard fight
      if (z < -2 && z > -18) continue;
      place(center - 5.5, z);
      place(center + 5.5, z + 6);
    }

    // Lanterns flanking the temple front and the final approach to the arena
    place(-7, -52);
    place(7, -52);
    place(-5.5, -82);
    place(5.5, -82);

    return group;
  }

  public static generateSingle(): THREE.Group {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x59606a, roughness: 0.9, metalness: 0.02, flatShading: true });
    const emissiveMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(LANTERN_COLOR).multiplyScalar(4) });

    const baseGeo = new THREE.BoxGeometry(1.2, 0.4, 1.2);
    baseGeo.translate(0, 0.2, 0);

    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.5, 6);
    pillarGeo.translate(0, 1.15, 0);

    const headBaseGeo = new THREE.BoxGeometry(1.4, 0.2, 1.4);
    headBaseGeo.translate(0, 2.0, 0);

    // Four posts rather than a solid box, so the flame is visible from any side
    const postGeos = [-0.32, 0.32].flatMap(px => [-0.32, 0.32].map(pz => {
      const post = new THREE.BoxGeometry(0.12, 0.8, 0.12);
      post.translate(px, 2.5, pz);
      return post;
    }));

    const roofGeo = new THREE.ConeGeometry(1.4, 0.8, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 3.3, 0);

    const capGeo = new THREE.SphereGeometry(0.3, 8, 6);
    capGeo.translate(0, 3.8, 0);

    const prefab = new THREE.Group();

    [baseGeo, pillarGeo, headBaseGeo, ...postGeos, roofGeo, capGeo].forEach(geo => {
      const mesh = new THREE.Mesh(geo, stoneMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      prefab.add(mesh);
    });

    const coreGeo = new THREE.BoxGeometry(0.42, 0.55, 0.42);
    coreGeo.translate(0, LANTERN_CORE_HEIGHT, 0);
    prefab.add(new THREE.Mesh(coreGeo, emissiveMat));

    const glow = createGlowSprite(LANTERN_COLOR, 3.4, 0.55);
    glow.position.y = LANTERN_CORE_HEIGHT;
    prefab.add(glow);

    prefab.add(createLightPool(LANTERN_COLOR, 6, 0.16));

    return prefab;
  }
}
