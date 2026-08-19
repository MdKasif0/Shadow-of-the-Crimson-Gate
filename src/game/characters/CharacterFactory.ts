import * as THREE from 'three';
import { Ronin } from './Ronin';
import { Yokai } from './Yokai';

export class CharacterFactory {
  public static createRonin(): THREE.Group {
    const ronin = new Ronin();
    return ronin.rig.group;
  }

  public static createRoninFull(): Ronin {
    return new Ronin();
  }

  public static createBasicYokai(): Yokai {
    return new Yokai();
  }

  // Architecture stubs for future characters
  public static createShadowYokai(): THREE.Group {
    const yokai = new Yokai();
    // Thinner, darker, cyan accents
    yokai.rig.group.scale.set(0.85, 1.05, 0.85);
    yokai.rig.group.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          const mat = mesh.material.clone() as THREE.MeshStandardMaterial;
          mat.color.multiplyScalar(0.5);
          mat.emissive.set(0x003344);
          mat.emissiveIntensity = 0.3;
          mesh.material = mat;
        }
      }
    });
    return yokai.rig.group;
  }

  public static createTengu(): THREE.Group {
    // Stub architecture — humanoid with beak and wings
    const yokai = new Yokai();
    // Elongate the head for beak
    const beakGeo = new THREE.ConeGeometry(0.04, 0.2, 4);
    const beak = new THREE.Mesh(beakGeo, new THREE.MeshStandardMaterial({ color: 0x2a1a0a }));
    beak.position.set(0, 0, 0.18);
    beak.rotation.x = Math.PI / 2;
    yokai.rig.bones.head.add(beak);
    return yokai.rig.group;
  }

  public static createCrimsonOni(): THREE.Group {
    // Stub architecture — massive boss
    const yokai = new Yokai();
    yokai.rig.group.scale.set(2.0, 2.0, 2.0);
    // Make horns bigger
    yokai.rig.bones.head.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry) {
        child.scale.set(2, 2.5, 2);
      }
    });
    // Crimson markings
    yokai.rig.group.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          const mat = mesh.material.clone() as THREE.MeshStandardMaterial;
          mat.emissive.set(0x330808);
          mat.emissiveIntensity = 0.4;
          mesh.material = mat;
        }
      }
    });
    return yokai.rig.group;
  }
}
