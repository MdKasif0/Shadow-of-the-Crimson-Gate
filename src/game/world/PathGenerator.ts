import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SeededRandom } from '../utils/MathUtils';
import { createSurfaceTextures } from '../utils/ProceduralTextures';
import { TerrainGenerator } from './TerrainGenerator';

const PATH_START_Z = 67;
const PATH_END_Z = -92;

/** Worn flagstones from the entrance gate to the arena, plus grass and fallen petals. */
export class PathGenerator {
  public static generate(random: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Path';

    group.add(this.buildStones(random));
    group.add(this.buildGrass(random));
    group.add(this.buildPetals(random));
    return group;
  }

  private static buildStones(random: SeededRandom): THREE.InstancedMesh {
    // Soften the top edges so stones catch light instead of looking like tiles
    const geometry = new THREE.BoxGeometry(1, 0.2, 1, 3, 1, 3);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const edge = Math.max(Math.abs(positions.getX(i)), Math.abs(positions.getZ(i)));
      if (positions.getY(i) > 0 && edge > 0.45) positions.setY(i, positions.getY(i) - 0.05);
    }
    geometry.computeVertexNormals();

    const { map, normalMap } = createSurfaceTextures([6, 12, 24, 48], 912, 4);
    const material = new THREE.MeshStandardMaterial({ map, normalMap, roughness: 0.88, metalness: 0.02 });

    const maxStones = 900;
    const stones = new THREE.InstancedMesh(geometry, material, maxStones);
    stones.receiveShadow = true;
    stones.castShadow = false;

    const dummy = new THREE.Object3D();
    const shade = new THREE.Color();
    let index = 0;
    for (let z = PATH_START_Z; z > PATH_END_Z && index < maxStones - 3; z -= random.range(0.95, 1.2)) {
      const center = TerrainGenerator.pathOffset(z);
      const columns = random.next() > 0.45 ? 3 : 2;
      for (let c = 0; c < columns; c++) {
        const across = (c - (columns - 1) / 2) * (3.1 / columns);
        const sizeX = 3.1 / columns - random.range(0.06, 0.2);
        const sizeZ = random.range(0.72, 1.0);
        dummy.position.set(center + across + random.range(-0.05, 0.05), -0.075, z);
        dummy.rotation.y = random.range(-0.07, 0.07);
        dummy.scale.set(sizeX, random.range(0.8, 1.1), sizeZ);
        dummy.updateMatrix();
        stones.setMatrixAt(index, dummy.matrix);

        const value = random.range(0.32, 0.55);
        shade.setRGB(value, value * 0.98, value * 0.96);
        stones.setColorAt(index, shade);
        index++;
      }
    }
    stones.count = index;
    stones.instanceMatrix.needsUpdate = true;
    return stones;
  }

  private static buildGrass(random: SeededRandom): THREE.InstancedMesh {
    const blades = [-0.35, 0.05, 0.4].map((lean, i) => {
      const blade = new THREE.ConeGeometry(0.035, 0.42 + i * 0.07, 3);
      blade.translate(0, 0.21, 0);
      blade.rotateZ(lean);
      blade.rotateY(i * 2.1);
      return blade;
    });
    const geometry = mergeGeometries(blades);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.95 });

    const count = 9000;
    const grass = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    const shade = new THREE.Color();

    let index = 0;
    while (index < count) {
      const x = random.range(-34, 34);
      const z = random.range(-88, 78);
      if (Math.abs(x - TerrainGenerator.pathOffset(z)) < 2.4) continue;
      if (z < -56 && z > -74 && Math.abs(x) < 10) continue; // Temple footprint

      dummy.position.set(x, TerrainGenerator.heightAt(x, z), z);
      dummy.rotation.set(random.range(-0.25, 0.25), random.next() * 6.28, random.range(-0.25, 0.25));
      const scale = random.range(0.6, 1.5);
      dummy.scale.set(scale, scale * random.range(0.8, 1.4), scale);
      dummy.updateMatrix();
      grass.setMatrixAt(index, dummy.matrix);

      // Grass is lush at the courtyard and turns grey and sickly towards the temple
      const blight = THREE.MathUtils.smoothstep(-z, 15, 60);
      shade.setHex(0x5f8a48).lerp(new THREE.Color(0x4c4840), blight).multiplyScalar(random.range(0.7, 1.25));
      grass.setColorAt(index, shade);
      index++;
    }
    grass.instanceMatrix.needsUpdate = true;
    return grass;
  }

  private static buildPetals(random: SeededRandom): THREE.InstancedMesh {
    const geometry = new THREE.CircleGeometry(0.075, 5);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: 0xf0a8c0, roughness: 0.8, emissive: 0x401022, emissiveIntensity: 0.5 });

    const count = 2600;
    const petals = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const x = random.range(-26, 26);
      const z = random.range(-22, 60);
      dummy.position.set(x, Math.max(TerrainGenerator.heightAt(x, z), 0) + 0.015, z);
      dummy.rotation.set(random.range(-0.2, 0.2), random.next() * 6.28, random.range(-0.2, 0.2));
      dummy.scale.setScalar(random.range(0.6, 1.3));
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
    return petals;
  }
}
