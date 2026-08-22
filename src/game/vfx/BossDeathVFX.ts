import * as THREE from 'three';

interface EnergyParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scaleBase: number;
}

export class BossDeathVFX {
  private scene: THREE.Scene;
  private particles: EnergyParticle[] = [];
  
  private coreMesh: THREE.Mesh | null = null;
  private coreTimer: number = 0;
  
  private particleGeo: THREE.BoxGeometry;
  private particleMat: THREE.MeshStandardMaterial;
  private coreGeo: THREE.SphereGeometry;
  private coreMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    this.particleGeo = new THREE.BoxGeometry(0.3, 0.6, 0.3);
    this.particleMat = new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: 0xff0000,
      emissiveIntensity: 4.0,
      transparent: true,
      opacity: 0.8
    });
    
    this.coreGeo = new THREE.SphereGeometry(2.0, 16, 16);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xffaaaa,
      emissive: 0xff2200,
      emissiveIntensity: 5.0,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  public spawn(position: THREE.Vector3): void {
    // Spawn energy particles
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, this.particleMat.clone());
      // Spread them around the boss
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2.0;
      mesh.position.copy(position);
      mesh.position.x += Math.cos(angle) * radius;
      mesh.position.z += Math.sin(angle) * radius;
      mesh.position.y += Math.random() * 3.0; // Distribute vertically
      
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      this.scene.add(mesh);
      
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4.0,
          Math.random() * 6.0 + 2.0, // Rise up
          (Math.random() - 0.5) * 4.0
        ),
        life: 0,
        maxLife: Math.random() * 1.5 + 1.0,
        scaleBase: Math.random() * 0.5 + 0.5
      });
    }

    // Spawn expanding core
    if (!this.coreMesh) {
      this.coreMesh = new THREE.Mesh(this.coreGeo, this.coreMat.clone());
      this.scene.add(this.coreMesh);
    }
    this.coreMesh.position.copy(position);
    this.coreMesh.position.y += 1.5;
    this.coreMesh.scale.set(0.1, 0.1, 0.1);
    (this.coreMesh.material as THREE.MeshStandardMaterial).opacity = 0.8;
    this.coreTimer = 0;
  }

  public update(dt: number): void {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += dt * 2.0;
      p.mesh.rotation.y += dt * 2.0;
      
      const progress = p.life / p.maxLife;
      const currentScale = p.scaleBase * (1.0 - progress);
      p.mesh.scale.setScalar(currentScale);
      
      (p.mesh.material as THREE.MeshStandardMaterial).opacity = 1.0 - progress;
    }
    
    // Update core
    if (this.coreMesh) {
      this.coreTimer += dt;
      if (this.coreTimer < 2.0) {
        const progress = this.coreTimer / 2.0;
        this.coreMesh.scale.setScalar(0.1 + progress * 5.0); // Expand
        (this.coreMesh.material as THREE.MeshStandardMaterial).opacity = (1.0 - progress) * 0.8; // Fade
      } else {
        this.scene.remove(this.coreMesh);
        (this.coreMesh.material as THREE.Material).dispose();
        this.coreMesh = null;
      }
    }
  }
}
