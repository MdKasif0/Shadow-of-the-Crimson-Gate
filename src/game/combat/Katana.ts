import * as THREE from 'three';
import { Weapon } from './Weapon';

export class Katana implements Weapon {
  public mesh: THREE.Group;
  public sheathMesh: THREE.Group;
  
  private baseDamage: number = 20;
  private range: number = 2.0;
  private hitAngle: number = Math.PI / 2; // 90 degree forward cone

  constructor() {
    this.mesh = new THREE.Group();
    this.mesh.name = 'KatanaWeapon';

    const armorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.2 }); 
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.8 }); 
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.1 });
    const wrapMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });

    // ─── WEAPON MESH (Katana) ────────────────────────────────────────────────
    
    // Handle (Tsuka)
    const handleGeo = new THREE.BoxGeometry(0.04, 0.05, 0.25);
    handleGeo.translate(0, 0, 0.125);
    const handle = new THREE.Mesh(handleGeo, wrapMat);
    this.mesh.add(handle);

    // Guard (Tsuba)
    const guardMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8), accentMat);
    guardMesh.rotation.x = Math.PI / 2;
    guardMesh.position.z = 0.26;
    this.mesh.add(guardMesh);

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.015, 0.04, 0.8);
    bladeGeo.translate(0, 0, 0.4);
    
    // Curve the blade slightly
    const bPos = bladeGeo.attributes.position;
    for(let i = 0; i < bPos.count; i++) {
      const z = bPos.getZ(i);
      if (z > 0.1) {
        bPos.setY(i, bPos.getY(i) + Math.pow(z * 0.8, 2) * 0.05);
      }
      // Taper tip
      if (z > 0.75 && bPos.getY(i) > 0) {
        bPos.setY(i, 0);
      }
    }
    bladeGeo.computeVertexNormals();
    
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.z = 0.27;
    this.mesh.add(blade);

    // Default orientation for holding in hand (pointing forward)
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.position.set(0, -0.05, 0.05);

    // ─── SHEATH MESH (Saya) ──────────────────────────────────────────────────
    
    this.sheathMesh = new THREE.Group();
    this.sheathMesh.name = 'KatanaSheath';
    
    const sheathGeo = new THREE.BoxGeometry(0.05, 0.08, 1.0);
    sheathGeo.translate(0, 0, -0.4);
    const sheath = new THREE.Mesh(sheathGeo, armorMat);
    this.sheathMesh.add(sheath);
  }

  public attachTo(handSlot: THREE.Group): void {
    handSlot.add(this.mesh);
  }
  
  public attachSheathTo(pelvisSlot: THREE.Group): void {
    pelvisSlot.add(this.sheathMesh);
  }

  public getDamage(): number { return this.baseDamage; }
  public getRange(): number { return this.range; }
  public getHitAngle(): number { return this.hitAngle; }
}
