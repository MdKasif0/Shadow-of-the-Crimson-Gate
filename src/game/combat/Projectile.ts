import * as THREE from 'three';

export class Projectile {
  public id: string;
  public root: THREE.Group;
  
  public active: boolean = false;
  
  public position: THREE.Vector3 = new THREE.Vector3();
  public direction: THREE.Vector3 = new THREE.Vector3();
  public speed: number = 0;
  public damage: number = 0;
  public ownerId: string = '';
  public knockback: number = 0;
  
  public lifetime: number = 0;
  private maxLifetime: number = 0;

  private mesh: THREE.Mesh;
  private coreMesh: THREE.Mesh;
  private time: number = 0;

  constructor(id: string) {
    this.id = id;
    this.root = new THREE.Group();
    this.root.visible = false;

    // Procedural look: cyan core, dark teal aura
    const coreGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff, 
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);

    const auraGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x004455,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(auraGeo, auraMat);

    this.root.add(this.coreMesh);
    this.root.add(this.mesh);
  }

  public fire(
    ownerId: string,
    startPos: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    knockback: number,
    maxLifetime: number
  ): void {
    this.active = true;
    this.ownerId = ownerId;
    this.position.copy(startPos);
    this.direction.copy(direction).normalize();
    this.speed = speed;
    this.damage = damage;
    this.knockback = knockback;
    this.lifetime = 0;
    this.maxLifetime = maxLifetime;
    
    this.root.position.copy(this.position);
    this.root.visible = true;
    this.time = 0;
  }

  public update(dt: number): void {
    if (!this.active) return;

    this.time += dt;
    this.lifetime += dt;

    if (this.lifetime >= this.maxLifetime) {
      this.deactivate();
      return;
    }

    // Move
    this.position.add(this.direction.clone().multiplyScalar(this.speed * dt));
    this.root.position.copy(this.position);

    // Visual pulse
    const scale = 1.0 + Math.sin(this.time * 15.0) * 0.2;
    this.mesh.scale.set(scale, scale, scale);
  }

  public deactivate(): void {
    this.active = false;
    this.root.visible = false;
  }
}
