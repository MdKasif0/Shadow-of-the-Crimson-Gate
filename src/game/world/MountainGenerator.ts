import * as THREE from 'three';

export class MountainGenerator {
  public static create(): THREE.Group {
    const group = new THREE.Group();
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x1a2030, roughness: 0.95, metalness: 0.0,
    });

    const peaks = [
      { x: -30, z: -45, w: 25, h: 18 },
      { x: 0, z: -50, w: 30, h: 22 },
      { x: 25, z: -42, w: 20, h: 15 },
      { x: -15, z: -48, w: 18, h: 12 },
      { x: 15, z: -55, w: 22, h: 16 },
    ];

    peaks.forEach(p => {
      const geo = new THREE.ConeGeometry(p.w, p.h, 5 + Math.floor(Math.random() * 3));
      const pos = geo.attributes.position;
      // Randomize vertices for organic shape
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
        if (y > -p.h / 2 + 0.5) {
          pos.setXYZ(i, x + (Math.random() - 0.5) * 3, y, z + (Math.random() - 0.5) * 3);
        }
      }
      geo.computeVertexNormals();
      const mountain = new THREE.Mesh(geo, mountainMat);
      mountain.position.set(p.x, p.h / 2 - 2, p.z);
      mountain.castShadow = false;
      mountain.receiveShadow = false;
      group.add(mountain);
    });

    return group;
  }
}
