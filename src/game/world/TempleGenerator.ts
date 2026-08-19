import * as THREE from 'three';

import { CollisionSystem } from '../physics/CollisionSystem';

export class TempleGenerator {
  public static generate(collisionSystem: CollisionSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Temple';

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x1a110a, roughness: 0.9 });
    const crimsonMat = new THREE.MeshStandardMaterial({ color: 0x6b1111, roughness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x11161a, roughness: 0.8, flatShading: true });
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 1.0 });

    const width = 16;
    const depth = 12;
    const baseHeight = 1.2;

    // Stone foundation
    const foundationMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(width + 2, baseHeight, depth + 2), foundationMat);
    foundation.position.y = baseHeight / 2;
    foundation.receiveShadow = true;
    foundation.castShadow = true;
    group.add(foundation);

    // Front stairs
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4, 0.25, 0.6), foundationMat);
      step.position.set(0, i * 0.25 + 0.125, depth / 2 + 1 + (4 - i) * 0.6 - 0.3);
      step.receiveShadow = true;
      group.add(step);
    }

    // Wooden deck (Engawa)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width + 1, 0.2, depth + 1), woodMat);
    deck.position.y = baseHeight + 0.1;
    group.add(deck);

    // Main hall block
    const hallHeight = 5;
    const hall = new THREE.Mesh(new THREE.BoxGeometry(width - 2, hallHeight, depth - 2), woodMat);
    hall.position.y = baseHeight + 0.2 + hallHeight / 2;
    hall.castShadow = true;
    group.add(hall);

    // Shoji doors (front)
    const doorWidth = 1.8;
    const doorHeight = 3.5;
    for (let i = -2; i <= 2; i++) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.1), paperMat);
      door.position.set(i * (doorWidth + 0.2), baseHeight + 0.2 + doorHeight / 2, depth / 2 - 0.95);
      
      // Wooden grid on door
      const grid = new THREE.Group();
      const vMullion = new THREE.Mesh(new THREE.BoxGeometry(0.1, doorHeight, 0.15), woodMat);
      const hMullion = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 0.1, 0.15), woodMat);
      
      for(let x=-0.6; x<=0.6; x+=0.6) {
        const v = vMullion.clone();
        v.position.x = x;
        grid.add(v);
      }
      for(let y=-1.0; y<=1.0; y+=0.6) {
        const h = hMullion.clone();
        h.position.y = y;
        grid.add(h);
      }
      door.add(grid);
      group.add(door);
    }

    // Crimson pillars around deck
    const pCountX = 6;
    const pCountZ = 4;
    for (let x = 0; x <= pCountX; x++) {
      for (let z = 0; z <= pCountZ; z++) {
        if (x > 0 && x < pCountX && z > 0 && z < pCountZ) continue; // Skip inner
        
        const px = (x / pCountX - 0.5) * width;
        const pz = (z / pCountZ - 0.5) * depth;
        
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, hallHeight, 8), crimsonMat);
        pillar.position.set(px, baseHeight + 0.2 + hallHeight / 2, pz);
        pillar.castShadow = true;
        group.add(pillar);
      }
    }

    // Lower Roof (Mokoshi)
    const lowerRoofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, 3, 4);
    lowerRoofGeo.rotateY(Math.PI / 4);
    // Squash it to fit rectangle
    lowerRoofGeo.scale(width / Math.max(width, depth), 1, depth / Math.max(width, depth));
    const lowerRoof = new THREE.Mesh(lowerRoofGeo, roofMat);
    lowerRoof.position.y = baseHeight + hallHeight + 1.0;
    lowerRoof.castShadow = true;
    group.add(lowerRoof);

    // Upper level (Irimoya style top)
    const upperHeight = 3;
    const upperHall = new THREE.Mesh(new THREE.BoxGeometry(width - 6, upperHeight, depth - 6), woodMat);
    upperHall.position.y = baseHeight + hallHeight + 1.5 + upperHeight / 2;
    upperHall.castShadow = true;
    group.add(upperHall);

    // Upper Roof
    const upperRoofGeo = new THREE.ConeGeometry(Math.max(width - 4, depth - 4) * 0.75, 4, 4);
    upperRoofGeo.rotateY(Math.PI / 4);
    upperRoofGeo.scale((width - 4) / Math.max(width - 4, depth - 4), 1, (depth - 4) / Math.max(width - 4, depth - 4));
    
    // Modify vertices for sweeping curves
    const pos = upperRoofGeo.attributes.position;
    for(let i=0; i<pos.count; i++) {
      const y = pos.getY(i);
      const nx = pos.getX(i);
      const nz = pos.getZ(i);
      // Lift corners
      if (y < 0) {
        const dist = Math.sqrt(nx*nx + nz*nz);
        pos.setY(i, y + dist * 0.15); 
      }
    }
    upperRoofGeo.computeVertexNormals();

    const upperRoof = new THREE.Mesh(upperRoofGeo, roofMat);
    upperRoof.position.y = baseHeight + hallHeight + 1.5 + upperHeight + 1.5;
    upperRoof.castShadow = true;
    group.add(upperRoof);

    // Gold ornaments on roof ridge
    const ridgeLen = width - 8;
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(ridgeLen, 0.4, 0.4), woodMat);
    ridge.position.y = baseHeight + hallHeight + 1.5 + upperHeight + 3.4;
    group.add(ridge);

    for(const side of [-1, 1]) {
      const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 1.2, 4), new THREE.MeshStandardMaterial({color: 0xc4a35a, metalness: 0.8}));
      finial.position.set(side * (ridgeLen / 2 - 0.2), baseHeight + hallHeight + 1.5 + upperHeight + 3.8, 0);
      finial.rotation.z = side * Math.PI / 6;
      group.add(finial);
    }

    // Position temple at back of courtyard
    group.position.set(0, 0, -18);

    // Register collision
    const templeBox = new THREE.Box3(
      new THREE.Vector3(-width / 2, 0, -18 - depth / 2),
      new THREE.Vector3(width / 2, 10, -18 + depth / 2)
    );
    collisionSystem.addBox(templeBox);

    return group;
  }
}
