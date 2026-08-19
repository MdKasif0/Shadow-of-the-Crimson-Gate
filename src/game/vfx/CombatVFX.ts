import * as THREE from 'three';

/** Procedural katana slash arc VFX */
export class SlashVFX {
  private meshes: THREE.Mesh[] = [];
  private scene: THREE.Scene;
  private pool: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Pre-create pool
    const geo = new THREE.RingGeometry(0.3, 1.2, 12, 1, 0, Math.PI * 0.8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.8,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push(mesh);
    }
  }

  public spawn(position: THREE.Vector3, direction: THREE.Vector3, comboIndex: number): void {
    const mesh = this.pool.find(m => !m.visible);
    if (!mesh) return;
    mesh.visible = true;
    mesh.position.copy(position);
    mesh.position.y += 1.0;
    const angle = Math.atan2(direction.x, direction.z);
    mesh.rotation.set(0, angle, comboIndex === 1 ? Math.PI / 3 : 0);
    mesh.scale.set(1, 1, 1);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
    (mesh.material as THREE.MeshBasicMaterial).color.set(
      comboIndex === 2 ? 0xff4444 : 0xffffff
    );
    this.meshes.push(mesh);
  }

  public update(dt: number): void {
    for (let i = this.meshes.length - 1; i >= 0; i--) {
      const m = this.meshes[i];
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity -= dt * 5;
      m.scale.multiplyScalar(1 + dt * 3);
      if (mat.opacity <= 0) {
        m.visible = false;
        this.meshes.splice(i, 1);
      }
    }
  }
}

/** Hit impact VFX */
export class HitVFX {
  private particles: THREE.Mesh[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) { this.scene = scene; }

  public spawn(position: THREE.Vector3): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.04, 4, 3);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xffaa44 : 0xffffff,
        transparent: true, opacity: 1.0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      p.position.y += 1.0;
      const angle = (i / count) * Math.PI * 2;
      p.userData = {
        vx: Math.cos(angle) * (2 + Math.random()),
        vy: 1 + Math.random() * 2,
        vz: Math.sin(angle) * (2 + Math.random()),
      };
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const d = p.userData;
      p.position.x += d.vx * dt;
      p.position.y += d.vy * dt;
      p.position.z += d.vz * dt;
      d.vy -= 8 * dt; // gravity
      const mat = p.material as THREE.MeshBasicMaterial;
      mat.opacity -= dt * 3;
      if (mat.opacity <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        mat.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}

/** Dash trail VFX */
export class DashVFX {
  private trails: THREE.Mesh[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) { this.scene = scene; }

  public spawn(position: THREE.Vector3): void {
    const geo = new THREE.PlaneGeometry(0.3, 1.5);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4488ff, transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const trail = new THREE.Mesh(geo, mat);
    trail.position.copy(position);
    trail.position.y += 0.9;
    this.scene.add(trail);
    this.trails.push(trail);
  }

  public update(dt: number): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      const mat = t.material as THREE.MeshBasicMaterial;
      mat.opacity -= dt * 4;
      if (mat.opacity <= 0) {
        this.scene.remove(t);
        t.geometry.dispose();
        mat.dispose();
        this.trails.splice(i, 1);
      }
    }
  }
}

/** Death particle burst */
export class DeathVFX {
  private particles: THREE.Mesh[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) { this.scene = scene; }

  public spawn(position: THREE.Vector3): void {
    for (let i = 0; i < 20; i++) {
      const geo = new THREE.SphereGeometry(0.06, 4, 3);
      const mat = new THREE.MeshBasicMaterial({
        color: i < 10 ? 0x2a1a2a : 0x88ffff,
        transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      p.position.y += 1;
      p.userData = {
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 3,
        vz: (Math.random() - 0.5) * 3,
      };
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const d = p.userData;
      p.position.x += d.vx * dt;
      p.position.y += d.vy * dt;
      p.position.z += d.vz * dt;
      d.vy -= 2 * dt;
      const mat = p.material as THREE.MeshBasicMaterial;
      mat.opacity -= dt * 1.5;
      if (mat.opacity <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        mat.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}
