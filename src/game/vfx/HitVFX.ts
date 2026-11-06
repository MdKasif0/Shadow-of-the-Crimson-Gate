import * as THREE from 'three';
import { ParticlePool } from './ParticlePool';
import { AudioManager } from '../audio/AudioManager';

const SPARK_GRAVITY = 9;
const INK_GRAVITY = 14;
const DECAL_COUNT = 28;
const DECAL_LIFETIME = 9;

function createInkSplatTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';

  ctx.beginPath();
  ctx.arc(64, 64, 24, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 26; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 18 + Math.random() * 42;
    ctx.beginPath();
    ctx.arc(64 + Math.cos(angle) * distance, 64 + Math.sin(angle) * distance, 1 + Math.random() * 6 * (1 - distance / 70), 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * HitVFX — Bright sparks and flung ink on each confirmed hit, with splatter
 * left on the ground that slowly fades.
 */
export class HitVFX {
  private sparkPool: ParticlePool;
  private inkPool: ParticlePool;
  private decals: { mesh: THREE.Mesh; life: number }[] = [];
  private nextDecal = 0;

  constructor(scene: THREE.Scene) {
    const sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.34);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(5, 3.2, 1.4), // Above 1, so bloom catches it
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.sparkPool = new ParticlePool(sparkGeo, sparkMat, 120);
    scene.add(this.sparkPool.mesh);

    const inkGeo = new THREE.IcosahedronGeometry(0.075, 0);
    const inkMat = new THREE.MeshBasicMaterial({ color: 0x240208, transparent: true });
    this.inkPool = new ParticlePool(inkGeo, inkMat, 100);
    scene.add(this.inkPool.mesh);

    const decalGeo = new THREE.PlaneGeometry(1, 1);
    decalGeo.rotateX(-Math.PI / 2);
    const texture = createInkSplatTexture();
    for (let i = 0; i < DECAL_COUNT; i++) {
      const mesh = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({
        color: 0x190206,
        alphaMap: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }));
      mesh.visible = false;
      mesh.position.y = 0.045;
      scene.add(mesh);
      this.decals.push({ mesh, life: 0 });
    }
  }

  public spawn(position: THREE.Vector3, direction: THREE.Vector3, isHeavy: boolean): void {
    AudioManager.playSwordHit();

    const origin = position.clone();
    origin.y += 1.05;

    const sparkCount = isHeavy ? 20 : 11;
    for (let i = 0; i < sparkCount; i++) {
      const spread = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize();
      const velocity = direction.clone().multiplyScalar(4).add(spread.multiplyScalar(4 + Math.random() * 5));
      this.sparkPool.emit(origin, velocity, 0.16 + Math.random() * 0.22, 0.6 + Math.random() * 0.8);
    }

    const inkCount = isHeavy ? 22 : 10;
    for (let i = 0; i < inkCount; i++) {
      const spread = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize();
      const velocity = direction.clone().multiplyScalar(3 + Math.random() * 3).add(spread.multiplyScalar(1.5 + Math.random() * 3));
      this.inkPool.emit(origin, velocity, 0.45 + Math.random() * 0.35, 0.5 + Math.random());
    }

    this.placeDecal(position, direction, isHeavy ? 2.6 : 1.5);
    if (isHeavy) this.placeDecal(position.clone().addScaledVector(direction, 1.2), direction, 1.3);
  }

  private placeDecal(position: THREE.Vector3, direction: THREE.Vector3, size: number): void {
    const decal = this.decals[this.nextDecal];
    this.nextDecal = (this.nextDecal + 1) % DECAL_COUNT;

    decal.life = DECAL_LIFETIME;
    decal.mesh.visible = true;
    decal.mesh.position.x = position.x + direction.x * 0.6 + (Math.random() - 0.5) * 0.4;
    decal.mesh.position.z = position.z + direction.z * 0.6 + (Math.random() - 0.5) * 0.4;
    decal.mesh.rotation.y = Math.random() * Math.PI * 2;
    decal.mesh.scale.setScalar(size * (0.8 + Math.random() * 0.4));
  }

  public update(dt: number): void {
    this.sparkPool.update(dt, (p) => {
      p.velocity.y -= SPARK_GRAVITY * dt;
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.multiplyScalar(Math.exp(-3 * dt));
      p.scale = p.life / p.maxLife;
    });

    this.inkPool.update(dt, (p) => {
      p.velocity.y -= INK_GRAVITY * dt;
      p.position.addScaledVector(p.velocity, dt);
      if (p.position.y < 0.05) {
        p.position.y = 0.05;
        p.velocity.set(0, 0, 0);
      }
    });

    for (const decal of this.decals) {
      if (decal.life <= 0) continue;
      decal.life -= dt;
      decal.mesh.visible = decal.life > 0;
      (decal.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.72, decal.life / 2);
    }
  }
}
