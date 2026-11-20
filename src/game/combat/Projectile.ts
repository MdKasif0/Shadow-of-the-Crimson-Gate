import * as THREE from 'three';

export type ProjectileType = 'DEFAULT' | 'CRIMSON_ARC' | 'FIRE' | 'WATER' | 'POISON' | 'VOID';

/** Core and aura colours for the plain orb projectiles. */
const ORB_COLORS: Record<string, { core: number; aura: number; size: number }> = {
  DEFAULT: { core: 0x00ffff, aura: 0x004455, size: 1 },
  FIRE: { core: 0xffc04a, aura: 0xa82808, size: 1.25 },
  WATER: { core: 0xc8f0ff, aura: 0x1a5a8a, size: 1.4 },
  POISON: { core: 0xd8ff7a, aura: 0x3a6a10, size: 1.1 },
  VOID: { core: 0xff4a8a, aura: 0x3a0828, size: 1.5 },
};

export class Projectile {
  public id: string;
  public root: THREE.Group;
  public type: ProjectileType;
  
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

  constructor(id: string, type: ProjectileType = 'DEFAULT') {
    this.id = id;
    this.type = type;
    this.root = new THREE.Group();
    this.root.visible = false;

    if (type === 'CRIMSON_ARC') {
      const coreGeo = new THREE.BoxGeometry(3.0, 0.2, 0.5); // Wide arc shape
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      this.coreMesh = new THREE.Mesh(coreGeo, coreMat);

      const auraGeo = new THREE.BoxGeometry(3.5, 0.6, 1.0);
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0x660000,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.mesh = new THREE.Mesh(auraGeo, auraMat);
    } else {
      const look = ORB_COLORS[type] ?? ORB_COLORS.DEFAULT;
      const coreGeo = new THREE.SphereGeometry(0.15 * look.size, 8, 8);
      const coreMat = new THREE.MeshBasicMaterial({ color: look.core });
      this.coreMesh = new THREE.Mesh(coreGeo, coreMat);

      const auraGeo = new THREE.SphereGeometry(0.3 * look.size, 16, 16);
      const auraMat = new THREE.MeshBasicMaterial({
        color: look.aura,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.mesh = new THREE.Mesh(auraGeo, auraMat);
    }

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

  /** Bends the flight path, as a gust of wind does. Keeps the speed the same. */
  public deflect(push: THREE.Vector3, dt: number): void {
    if (!this.active || push.lengthSq() === 0) return;
    this.direction.addScaledVector(push, dt / Math.max(this.speed, 1)).setY(0).normalize();
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
