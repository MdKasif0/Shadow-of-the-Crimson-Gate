import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';

export class ToriiGenerator {
  public static generate(collisionSystem: CollisionSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Torii';

    // Materials
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a1515, roughness: 0.8, metalness: 0.05 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x2b332b, roughness: 1.0 }); // Mossy rock
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xb89942, roughness: 0.4, metalness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.8, side: THREE.DoubleSide });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc8b589, roughness: 1.0 });
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 1.0, side: THREE.DoubleSide });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffaa33, emissiveIntensity: 2.0 });

    const height = 8;
    const radius = 0.55;
    const separation = 7;

    const addMesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // ─── Pillars & Bases ────────────────────────────────────────────────
    for (const sign of [-1, 1]) {
      const pX = sign * (separation / 2);
      
      // Main Pillar
      const pillarGeo = new THREE.CylinderGeometry(radius * 0.9, radius, height, 16);
      const pillar = addMesh(group, pillarGeo, woodMat);
      pillar.position.set(pX, height / 2, 0);

      // Gold Trim bands on pillar
      const bandGeo = new THREE.TorusGeometry(radius * 0.92, 0.05, 8, 16);
      bandGeo.rotateX(Math.PI/2);
      const upperBand = addMesh(group, bandGeo, goldMat);
      upperBand.position.set(pX, height - 1.2, 0);
      const lowerBand = addMesh(group, bandGeo, goldMat);
      lowerBand.position.set(pX, height - 1.8, 0);

      // Mossy Rock Base Cluster
      const rockGroup = new THREE.Group();
      rockGroup.position.set(pX, 0, 0);
      group.add(rockGroup);
      
      const rockCount = 8;
      for (let i = 0; i < rockCount; i++) {
        const rSize = 0.6 + Math.random() * 0.8;
        const rockGeo = new THREE.DodecahedronGeometry(rSize, 1);
        const rock = addMesh(rockGroup, rockGeo, rockMat);
        const angle = (i / rockCount) * Math.PI * 2;
        const dist = Math.random() * 1.5;
        rock.position.set(Math.cos(angle) * dist, rSize * 0.3, Math.sin(angle) * dist);
        rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        rock.scale.set(1, 0.6 + Math.random()*0.4, 1);
      }

      // Creeping Red Maple Leaves
      const leafCount = 20;
      const leafGeo = new THREE.PlaneGeometry(0.3, 0.3);
      for (let i = 0; i < leafCount; i++) {
        const leaf = addMesh(rockGroup, leafGeo, leafMat);
        const lAngle = Math.random() * Math.PI * 2;
        const lHeight = Math.random() * 3; // creeping up the pillar
        const lDist = radius + 0.1 - (lHeight * 0.05); // closer as it goes up
        leaf.position.set(Math.cos(lAngle) * lDist, lHeight + 0.5, Math.sin(lAngle) * lDist);
        leaf.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      }
      // Leaves on the rocks
      for (let i = 0; i < 15; i++) {
        const leaf = addMesh(rockGroup, leafGeo, leafMat);
        const lAngle = Math.random() * Math.PI * 2;
        const lDist = 1.0 + Math.random() * 1.5;
        leaf.position.set(Math.cos(lAngle) * lDist, 0.2 + Math.random()*0.5, Math.sin(lAngle) * lDist);
        leaf.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      }

      // Hanging Lantern on the inner face of the pillar
      const lanternGroup = new THREE.Group();
      // Bracket
      const bracketGeo = new THREE.BoxGeometry(1.0, 0.15, 0.15);
      const bracket = addMesh(lanternGroup, bracketGeo, woodMat);
      bracket.position.set(sign * -0.5, 0.5, 0); // pointing inward
      // Lantern Body
      const lBodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
      const lBody = addMesh(lanternGroup, lBodyGeo, woodMat);
      lBody.position.set(sign * -0.8, -0.2, 0);
      // Lantern Glow
      const lGlowGeo = new THREE.BoxGeometry(0.7, 1.0, 0.75);
      const lGlow = addMesh(lanternGroup, lGlowGeo, lightMat);
      lGlow.position.set(sign * -0.8, -0.2, 0);
      // Lantern Roof
      const lRoofGeo = new THREE.ConeGeometry(0.7, 0.5, 4);
      lRoofGeo.rotateY(Math.PI/4);
      const lRoof = addMesh(lanternGroup, lRoofGeo, roofMat);
      lRoof.position.set(sign * -0.8, 0.6, 0);
      // Lantern Tassel
      const lTasselGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4);
      const lTassel = addMesh(lanternGroup, lTasselGeo, leafMat); // red tassel
      lTassel.position.set(sign * -0.8, -1.0, 0);
      
      lanternGroup.position.set(pX, height * 0.45, 0);
      group.add(lanternGroup);
    }

    // ─── Crossbeams ─────────────────────────────────────────────────────
    
    // Nuki (Lower red beam, piercing pillars)
    const nukiHeight = height * 0.65;
    const nukiGeo = new THREE.BoxGeometry(separation + 3, 0.7, 0.7);
    const nuki = addMesh(group, nukiGeo, woodMat);
    nuki.position.set(0, nukiHeight, 0);

    // Shimaki (Upper red beam, right under Kasagi)
    const shimakiHeight = height - 0.4;
    const shimakiGeo = new THREE.BoxGeometry(separation + 4, 0.6, 0.8);
    const shimaki = addMesh(group, shimakiGeo, woodMat);
    shimaki.position.set(0, shimakiHeight, 0);

    // Kasagi (Curved black roof beam)
    class KasagiCurve extends THREE.Curve<THREE.Vector3> {
      constructor() {
        super();
      }
      getPoint(t: number, optionalTarget = new THREE.Vector3()) {
        const x = (t - 0.5) * (separation + 5);
        const y = Math.pow(Math.abs(t - 0.5) * 2, 2) * 0.6; // Upward sweep
        return optionalTarget.set(x, y, 0);
      }
    }
    const path = new KasagiCurve();
    const shape = new THREE.Shape();
    shape.moveTo(-0.7, 0.5);
    shape.lineTo(0.7, 0.5);
    shape.lineTo(0.6, -0.4);
    shape.lineTo(-0.6, -0.4);
    shape.lineTo(-0.7, 0.5);
    const kasagiGeo = new THREE.ExtrudeGeometry(shape, { steps: 30, extrudePath: path, bevelEnabled: false });
    const kasagi = addMesh(group, kasagiGeo, roofMat);
    kasagi.position.set(0, shimakiHeight + 0.4, 0);

    // Gaku-zuka (Center strut between Shimaki and Nuki)
    const strutGeo = new THREE.BoxGeometry(0.8, (shimakiHeight - nukiHeight), 0.6);
    const strut = addMesh(group, strutGeo, woodMat);
    strut.position.set(0, (shimakiHeight + nukiHeight) / 2, 0);

    // ─── Emblems ────────────────────────────────────────────────────────
    const emblemGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    emblemGeo.rotateX(Math.PI/2);
    // Left pillar/Nuki intersection
    addMesh(group, emblemGeo, goldMat).position.set(-separation/2, nukiHeight, 0.36);
    addMesh(group, emblemGeo, goldMat).position.set(-separation/2, nukiHeight, -0.36);
    // Right pillar/Nuki intersection
    addMesh(group, emblemGeo, goldMat).position.set(separation/2, nukiHeight, 0.36);
    addMesh(group, emblemGeo, goldMat).position.set(separation/2, nukiHeight, -0.36);
    // Center Nuki
    addMesh(group, emblemGeo, goldMat).position.set(0, nukiHeight, 0.36);
    addMesh(group, emblemGeo, goldMat).position.set(0, nukiHeight, -0.36);

    // ─── Shimenawa (Sacred Rope) ────────────────────────────────────────
    const ropeCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-separation/2 + radius, nukiHeight - 0.35, 0),
      new THREE.Vector3(0, nukiHeight - 2.5, 0), // droop point
      new THREE.Vector3(separation/2 - radius, nukiHeight - 0.35, 0)
    );
    const ropeGeo = new THREE.TubeGeometry(ropeCurve, 20, 0.2, 8, false);
    addMesh(group, ropeGeo, ropeMat);

    // Dangling Shide (Paper) & Tassels
    const points = ropeCurve.getPoints(6);
    for(let i=1; i<points.length-1; i++) {
      const p = points[i];
      // Tassel
      const tGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6);
      const tassel = addMesh(group, tGeo, ropeMat);
      tassel.position.set(p.x, p.y - 0.4, p.z);
      
      // Shide (Zigzag paper)
      const shideGeo = new THREE.PlaneGeometry(0.2, 0.8);
      // deform to zigzag
      const sPos = shideGeo.attributes.position;
      for(let v=0; v<sPos.count; v++) {
        if(v % 2 === 0) sPos.setX(v, sPos.getX(v) + 0.1);
      }
      shideGeo.computeVertexNormals();
      const shide = addMesh(group, shideGeo, paperMat);
      shide.position.set(p.x + 0.3, p.y - 0.6, p.z);
      shide.rotation.y = Math.PI/4;
    }

    return group;
  }
}
