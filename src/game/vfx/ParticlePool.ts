import * as THREE from 'three';

export interface ParticleState {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
  alpha: number;
}

export class ParticlePool {
  public mesh: THREE.InstancedMesh;
  private maxParticles: number;
  private particles: ParticleState[];
  private dummy: THREE.Object3D;
  private colorTarget: THREE.Color;

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, maxParticles: number = 1000) {
    this.maxParticles = maxParticles;
    this.mesh = new THREE.InstancedMesh(geometry, material, maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    // Support per-instance colors if material supports vertex colors
    if (material.vertexColors) {
      const colors = new Float32Array(maxParticles * 3);
      this.mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }

    this.mesh.frustumCulled = false; // Prevent flickering if bounds aren't updated

    this.dummy = new THREE.Object3D();
    this.colorTarget = new THREE.Color();

    this.particles = [];
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        scale: 1,
        life: 0,
        maxLife: 1,
        color: new THREE.Color(1, 1, 1),
        alpha: 1
      });
      // Initialize matrices to zero-scale to hide them
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    
    this.mesh.count = 0; // Active count
  }

  public emit(pos: THREE.Vector3, vel: THREE.Vector3, life: number, scale: number = 1, color?: THREE.Color): void {
    // Find first inactive particle
    let index = -1;
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.particles[i].active) {
        index = i;
        break;
      }
    }

    if (index === -1) return; // Pool full

    const p = this.particles[index];
    p.active = true;
    p.position.copy(pos);
    p.velocity.copy(vel);
    p.life = life;
    p.maxLife = life;
    p.scale = scale;
    p.alpha = 1.0;
    
    if (color) p.color.copy(color);

    if (index >= this.mesh.count) {
      this.mesh.count = index + 1;
    }
  }

  public update(dt: number, updateLogic?: (p: ParticleState, dt: number) => void): void {
    let activeMaxIndex = -1;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          // Hide
          this.dummy.scale.set(0, 0, 0);
          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(i, this.dummy.matrix);
        } else {
          // Custom logic or default integration
          if (updateLogic) {
            updateLogic(p, dt);
          } else {
            p.position.addScaledVector(p.velocity, dt);
          }

          // Apply to instance
          this.dummy.position.copy(p.position);
          this.dummy.scale.setScalar(p.scale);
          // Always point particles at camera or apply velocity alignment in specific pools
          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(i, this.dummy.matrix);
          
          if (this.mesh.instanceColor) {
            this.mesh.setColorAt(i, p.color);
          }
          activeMaxIndex = i;
        }
      }
    }

    this.mesh.count = activeMaxIndex + 1;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }
}
