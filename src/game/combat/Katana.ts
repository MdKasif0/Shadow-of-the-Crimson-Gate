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

    const scabbardMat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.8, metalness: 0.3 }); 
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x8a1515, roughness: 0.9 }); // Red
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xb5954a, roughness: 0.3, metalness: 0.9 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });
    const wrapMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 1.0 });

    // ─── WEAPON MESH (Katana) ────────────────────────────────────────────────
    
    // Handle (Tsuka)
    const handleGeo = new THREE.BoxGeometry(0.04, 0.05, 0.25);
    handleGeo.translate(0, 0, 0.125);
    const handle = new THREE.Mesh(handleGeo, wrapMat);
    // Gold pommel (Kashira)
    const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.03), goldMat);
    pommel.position.z = 0.0;
    handle.add(pommel);
    
    this.mesh.add(handle);

    // Guard (Tsuba) - Round and ornate (gold)
    const guardMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 16), goldMat);
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
    
    const sheathGeo = new THREE.BoxGeometry(0.05, 0.07, 0.85);
    sheathGeo.translate(0, 0, -0.425);
    
    // Curve the sheath to match blade
    const sPos = sheathGeo.attributes.position;
    for(let i = 0; i < sPos.count; i++) {
      const z = sPos.getZ(i);
      // Absolute Z distance from opening (Z=0 is opening, down to -0.85)
      const absZ = Math.abs(z);
      sPos.setY(i, sPos.getY(i) + Math.pow(absZ * 0.8, 2) * 0.05);
    }
    sheathGeo.computeVertexNormals();

    const sheath = new THREE.Mesh(sheathGeo, scabbardMat);
    
    // Gold trim at the sheath opening (Koiguchi)
    const koiguchi = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.03), goldMat);
    sheath.add(koiguchi);
    
    // Red Sageo (cord) wrapped around sheath
    const sageo = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.072, 0.1), accentMat);
    sageo.position.z = -0.15;
    sheath.add(sageo);

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
