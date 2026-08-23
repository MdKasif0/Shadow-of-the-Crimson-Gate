import * as THREE from 'three';
import { SeededRandom } from '../../utils/MathUtils';
import { CollisionSystem } from '../../collision/CollisionSystem';

export class ArenaGenerator {
  public static readonly CENTER_Z = -115;
  public static readonly ARENA_RADIUS = 20;
  public static readonly COURTYARD_SIZE = 46;
  public static corruptionMat: THREE.Material;

  public static generate(random: SeededRandom, collisionSystem: CollisionSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CourtyardArena';

    const center = new THREE.Vector3(0, 0, this.CENTER_Z);

    // ─── MATERIALS ───────────────────────────────────────────────────────────
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, flatShading: true });
    const lightStoneMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.95, flatShading: true });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x1f1b18, roughness: 1.0 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x15100c, roughness: 0.9 });
    const redPaintMat = new THREE.MeshStandardMaterial({ color: 0x771111, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x111112, roughness: 0.8, flatShading: true });

    // Helper to add meshes
    const addMesh = (
      parent: THREE.Group,
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      pos?: THREE.Vector3,
      rot?: THREE.Euler
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(geo, mat);
      if (pos) mesh.position.copy(pos);
      if (rot) mesh.rotation.copy(rot);
      mesh.castShadow = true;
      mesh.receiveShadow = false; // Disable receive shadow to prevent wavy acne
      parent.add(mesh);
      return mesh;
    };

    // ─── 1. GROUND & OCTAGONAL PLATFORM ──────────────────────────────────────
    
    // Dirt courtyard base
    addMesh(group, new THREE.BoxGeometry(this.COURTYARD_SIZE, 0.4, this.COURTYARD_SIZE), dirtMat, new THREE.Vector3(0, -0.4, this.CENTER_Z));

    // Raised Octagonal Platform (Boss Arena)
    const octagonGeo = new THREE.CylinderGeometry(this.ARENA_RADIUS, this.ARENA_RADIUS, 0.5, 8);
    octagonGeo.rotateY(Math.PI / 8); // Align flat edges to axes
    const platform = addMesh(group, octagonGeo, darkStoneMat, new THREE.Vector3(0, -0.1, this.CENTER_Z));
    platform.receiveShadow = true; // Flat cylinder is safe for shadows

    // Inner octagon pattern
    const innerOctGeo = new THREE.CylinderGeometry(this.ARENA_RADIUS * 0.7, this.ARENA_RADIUS * 0.7, 0.52, 8);
    innerOctGeo.rotateY(Math.PI / 8);
    addMesh(group, innerOctGeo, lightStoneMat, new THREE.Vector3(0, -0.1, this.CENTER_Z));

    // Center emblem pattern
    const centerOctGeo = new THREE.CylinderGeometry(this.ARENA_RADIUS * 0.3, this.ARENA_RADIUS * 0.3, 0.54, 8);
    centerOctGeo.rotateY(Math.PI / 8);
    addMesh(group, centerOctGeo, darkStoneMat, new THREE.Vector3(0, -0.1, this.CENTER_Z));

    // ─── 2. PERIMETER WALLS & FENCES ─────────────────────────────────────────

    const wallThickness = 1.5;
    const halfSize = this.COURTYARD_SIZE / 2;
    
    // Four walls forming a square
    const wallPositions = [
      { p: new THREE.Vector3(0, 0, this.CENTER_Z - halfSize), s: [this.COURTYARD_SIZE, 1.5, wallThickness] }, // North (Back)
      { p: new THREE.Vector3(0, 0, this.CENTER_Z + halfSize), s: [this.COURTYARD_SIZE, 1.5, wallThickness], isFront: true }, // South (Front)
      { p: new THREE.Vector3(-halfSize, 0, this.CENTER_Z), s: [wallThickness, 1.5, this.COURTYARD_SIZE] }, // West
      { p: new THREE.Vector3(halfSize, 0, this.CENTER_Z), s: [wallThickness, 1.5, this.COURTYARD_SIZE] }   // East
    ];

    for (const wp of wallPositions) {
      if (wp.isFront) {
        // Leave a gap for the front gate entrance
        const sideLen = (this.COURTYARD_SIZE - 6) / 2;
        addMesh(group, new THREE.BoxGeometry(sideLen, 1.5, wallThickness), darkStoneMat, new THREE.Vector3(wp.p.x - sideLen/2 - 3, 0.55, wp.p.z));
        addMesh(group, new THREE.BoxGeometry(sideLen, 1.5, wallThickness), darkStoneMat, new THREE.Vector3(wp.p.x + sideLen/2 + 3, 0.55, wp.p.z));
      } else {
        addMesh(group, new THREE.BoxGeometry(wp.s[0], wp.s[1], wp.s[2]), darkStoneMat, new THREE.Vector3(wp.p.x, 0.55, wp.p.z));
      }
    }

    // Register Square Bounds in Collision System
    const bHeight = 10;
    collisionSystem.addBox(new THREE.Box3(new THREE.Vector3(-halfSize - 2, 0, this.CENTER_Z - halfSize - 2), new THREE.Vector3(halfSize + 2, bHeight, this.CENTER_Z - halfSize + wallThickness))); // North
    collisionSystem.addBox(new THREE.Box3(new THREE.Vector3(-halfSize - 2, 0, this.CENTER_Z - halfSize), new THREE.Vector3(-halfSize + wallThickness, bHeight, this.CENTER_Z + halfSize))); // West
    collisionSystem.addBox(new THREE.Box3(new THREE.Vector3(halfSize - wallThickness, 0, this.CENTER_Z - halfSize), new THREE.Vector3(halfSize + 2, bHeight, this.CENTER_Z + halfSize))); // East
    // South wall pieces
    collisionSystem.addBox(new THREE.Box3(new THREE.Vector3(-halfSize, 0, this.CENTER_Z + halfSize - wallThickness), new THREE.Vector3(-3, bHeight, this.CENTER_Z + halfSize + 2)));
    collisionSystem.addBox(new THREE.Box3(new THREE.Vector3(3, 0, this.CENTER_Z + halfSize - wallThickness), new THREE.Vector3(halfSize, bHeight, this.CENTER_Z + halfSize + 2)));

    // Generate Fences on top of the walls
    const buildFence = (startX: number, startZ: number, endX: number, endZ: number) => {
      const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endZ - startZ, 2));
      const cx = (startX + endX) / 2;
      const cz = (startZ + endZ) / 2;
      const angle = Math.atan2(endX - startX, endZ - startZ); // Y-axis rotation
      
      const fenceGrp = new THREE.Group();
      fenceGrp.position.set(cx, 1.5, cz);
      fenceGrp.rotation.y = angle;

      // Posts
      const postCount = Math.floor(length / 2);
      for(let i=0; i<=postCount; i++) {
        const zPos = (i / postCount - 0.5) * length;
        addMesh(fenceGrp, new THREE.BoxGeometry(0.3, 1.2, 0.3), woodMat, new THREE.Vector3(0, 0.6, zPos));
      }
      // Rails
      addMesh(fenceGrp, new THREE.BoxGeometry(0.15, 0.15, length), redPaintMat, new THREE.Vector3(0, 0.4, 0));
      addMesh(fenceGrp, new THREE.BoxGeometry(0.15, 0.15, length), redPaintMat, new THREE.Vector3(0, 0.9, 0));
      
      group.add(fenceGrp);
    };

    // Front fences
    buildFence(-halfSize + 0.5, this.CENTER_Z + halfSize, -3, this.CENTER_Z + halfSize);
    buildFence(3, this.CENTER_Z + halfSize, halfSize - 0.5, this.CENTER_Z + halfSize);
    // Back fence
    buildFence(-halfSize + 0.5, this.CENTER_Z - halfSize, halfSize - 0.5, this.CENTER_Z - halfSize);
    // Side fences
    buildFence(-halfSize, this.CENTER_Z - halfSize + 0.5, -halfSize, this.CENTER_Z + halfSize - 0.5);
    buildFence(halfSize, this.CENTER_Z - halfSize + 0.5, halfSize, this.CENTER_Z + halfSize - 0.5);

    // ─── 3. FRONT GATE STRUCTURE ─────────────────────────────────────────────
    const gateGrp = new THREE.Group();
    gateGrp.position.set(0, 0, this.CENTER_Z + halfSize);
    
    // Gate Base (Two sides, open center)
    addMesh(gateGrp, new THREE.BoxGeometry(2, 2.0, 4), darkStoneMat, new THREE.Vector3(-3, 0.8, 0));
    addMesh(gateGrp, new THREE.BoxGeometry(2, 2.0, 4), darkStoneMat, new THREE.Vector3(3, 0.8, 0));
    // Flat stone path through the gate
    addMesh(gateGrp, new THREE.BoxGeometry(4, 0.2, 5), darkStoneMat, new THREE.Vector3(0, 0.1, 0));
    
    // Pillars
    for(let x of [-3.5, -1.5, 1.5, 3.5]) {
      addMesh(gateGrp, new THREE.CylinderGeometry(0.2, 0.2, 3, 8), woodMat, new THREE.Vector3(x, 3.3, 0));
    }
    // Crossbeams
    addMesh(gateGrp, new THREE.BoxGeometry(8.5, 0.4, 0.5), redPaintMat, new THREE.Vector3(0, 4.8, 0));
    
    // Roof
    const gateRoofGeo = new THREE.ConeGeometry(5.5, 2, 4);
    gateRoofGeo.rotateY(Math.PI / 4);
    gateRoofGeo.scale(1, 1, 0.6); // Squash depth
    const gPos = gateRoofGeo.attributes.position;
    for(let i=0; i<gPos.count; i++) {
      if(gPos.getY(i) < 0) gPos.setY(i, gPos.getY(i) + Math.abs(gPos.getX(i))*0.15); // Lift corners
    }
    gateRoofGeo.computeVertexNormals();
    addMesh(gateGrp, gateRoofGeo, roofMat, new THREE.Vector3(0, 6.0, 0));
    group.add(gateGrp);

    // ─── 4. BACK TEMPLE STRUCTURE ────────────────────────────────────────────
    const templeGrp = new THREE.Group();
    templeGrp.position.set(0, 0, this.CENTER_Z - halfSize + 2); // Positioned inside the back wall
    
    const tWidth = 18;
    const tDepth = 10;
    
    // Giant Base Platform
    addMesh(templeGrp, new THREE.BoxGeometry(tWidth, 2.5, tDepth), darkStoneMat, new THREE.Vector3(0, 1.05, 0));
    
    // Main Stairs
    for (let i = 0; i < 6; i++) {
      addMesh(templeGrp, new THREE.BoxGeometry(6, 0.4, 0.8), darkStoneMat, new THREE.Vector3(0, i * 0.4 + 0.2, tDepth/2 + 0.4 + (5 - i) * 0.8));
    }

    // Temple Walls / Core
    addMesh(templeGrp, new THREE.BoxGeometry(tWidth - 2, 4, tDepth - 2), woodMat, new THREE.Vector3(0, 4.3, 0));
    
    // Pillars around temple
    for(let x of [-8, -4, 0, 4, 8]) {
      addMesh(templeGrp, new THREE.CylinderGeometry(0.25, 0.25, 4.5, 8), redPaintMat, new THREE.Vector3(x, 4.5, tDepth/2 - 0.5));
    }

    // Lower Roof (Mokoshi)
    const tLowerRoofGeo = new THREE.ConeGeometry(tWidth * 0.6, 2.5, 4);
    tLowerRoofGeo.rotateY(Math.PI / 4);
    tLowerRoofGeo.scale(1, 1, (tDepth+2) / tWidth);
    addMesh(templeGrp, tLowerRoofGeo, roofMat, new THREE.Vector3(0, 7.55, 0));

    // Upper Story
    addMesh(templeGrp, new THREE.BoxGeometry(tWidth - 6, 2.5, tDepth - 4), woodMat, new THREE.Vector3(0, 10.05, 0));

    // Upper Roof (Irimoya)
    const tUpperRoofGeo = new THREE.ConeGeometry(tWidth * 0.5, 3.5, 4);
    tUpperRoofGeo.rotateY(Math.PI / 4);
    tUpperRoofGeo.scale(1, 1, tDepth / (tWidth-2));
    const tuPos = tUpperRoofGeo.attributes.position;
    for(let i=0; i<tuPos.count; i++) {
      if(tuPos.getY(i) < 0) {
        tuPos.setY(i, tuPos.getY(i) + Math.sqrt(tuPos.getX(i)*tuPos.getX(i) + tuPos.getZ(i)*tuPos.getZ(i)) * 0.15); // Curved corners
      }
    }
    tUpperRoofGeo.computeVertexNormals();
    addMesh(templeGrp, tUpperRoofGeo, roofMat, new THREE.Vector3(0, 13.05, 0));

    // Ridge ornament
    addMesh(templeGrp, new THREE.BoxGeometry(tWidth - 8, 0.6, 0.6), woodMat, new THREE.Vector3(0, 14.7, 0));

    group.add(templeGrp);

    // ─── 5. CORNER PAVILIONS ─────────────────────────────────────────────────
    const buildPavilion = (x: number, z: number, isLarge: boolean) => {
      const pGrp = new THREE.Group();
      pGrp.position.set(x, 0, z);
      
      const s = isLarge ? 5 : 4;
      // Base
      addMesh(pGrp, new THREE.BoxGeometry(s, 1.5, s), darkStoneMat, new THREE.Vector3(0, 0.55, 0));
      // Stairs facing center
      const sDirX = x > 0 ? -1 : 1;
      const sDirZ = z > this.CENTER_Z ? -1 : 1;
      
      // Pillars
      for(let px of [-s/2+0.5, s/2-0.5]) {
        for(let pz of [-s/2+0.5, s/2-0.5]) {
          addMesh(pGrp, new THREE.CylinderGeometry(0.15, 0.15, 3, 8), redPaintMat, new THREE.Vector3(px, 2.8, pz));
        }
      }
      
      // Roof
      const rGeo = new THREE.ConeGeometry(s*0.8, 2, 4);
      rGeo.rotateY(Math.PI / 4);
      const rp = rGeo.attributes.position;
      for(let i=0; i<rp.count; i++) {
        if(rp.getY(i) < 0) rp.setY(i, rp.getY(i) + Math.abs(rp.getX(i))*0.2); // Curved
      }
      rGeo.computeVertexNormals();
      addMesh(pGrp, rGeo, roofMat, new THREE.Vector3(0, 5.3, 0));
      
      group.add(pGrp);
    };

    const inset = halfSize - 3.5;
    // Front small pavilions
    buildPavilion(-inset, this.CENTER_Z + inset - 2, false);
    buildPavilion(inset, this.CENTER_Z + inset - 2, false);
    // Back larger shrines
    buildPavilion(-inset, this.CENTER_Z - inset + 2, true);
    buildPavilion(inset, this.CENTER_Z - inset + 2, true);

    // ─── 6. CORRUPTION DECAL (Hidden by default) ─────────────────────────────
    this.corruptionMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    // Ensure decal is slightly above the platform
    const decal = new THREE.Mesh(new THREE.CylinderGeometry(this.ARENA_RADIUS, this.ARENA_RADIUS, 0.6, 16), this.corruptionMat);
    decal.position.copy(new THREE.Vector3(0, -0.1, this.CENTER_Z));
    group.add(decal);

    return group;
  }

  public static purifyArena(dt: number): void {
    if (this.corruptionMat) {
      // Fade out corruption
      this.corruptionMat.opacity = THREE.MathUtils.lerp(this.corruptionMat.opacity, 0, dt * 2.0);
    }
  }
}
