import * as THREE from 'three';
import { CameraController } from '../camera/CameraController';

export class SakuraWindVFX {
  private scene: THREE.Scene;
  private particleSystem: THREE.Points;
  private camera: CameraController;

  private gustTimer: number = 0;
  private isGusting: boolean = false;
  private windDirection: THREE.Vector3 = new THREE.Vector3(1, 0, 1).normalize();

  constructor(scene: THREE.Scene, cameraController: CameraController) {
    this.scene = scene;
    this.camera = cameraController;

    const maxParticles = 100; // Lightweight
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const velocities = new Float32Array(maxParticles * 3);
    const opacities = new Float32Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      positions[i * 3 + 0] = 9999;
      positions[i * 3 + 1] = 9999;
      positions[i * 3 + 2] = 9999;
      velocities[i * 3 + 0] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
      opacities[i] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      color: 0xffaacc,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  public update(dt: number): void {
    this.gustTimer -= dt;
    
    if (this.gustTimer <= 0 && !this.isGusting) {
      this.startGust();
    }

    if (this.isGusting) {
      this.updateParticles(dt);
    }
  }

  private startGust(): void {
    this.isGusting = true;
    this.gustTimer = Math.random() * 10 + 15; // Gust every 15-25 seconds
    
    // Vary direction slightly
    this.windDirection.set(
      Math.random() * 2 - 1,
      0,
      Math.random() * 2 - 1
    ).normalize();

    const positions = this.particleSystem.geometry.attributes.position;
    const velocities = this.particleSystem.geometry.attributes.velocity;
    const opacities = this.particleSystem.geometry.attributes.opacity;

    const camPos = this.camera.camera.position;

    // Spawn 20-30 particles upwind
    const spawnCount = Math.floor(Math.random() * 10) + 20;
    
    for (let i = 0; i < spawnCount; i++) {
      // Spawn upwind so they cross the screen
      const upwindOffset = this.windDirection.clone().multiplyScalar(-30);
      const crossWind = new THREE.Vector3(-this.windDirection.z, 0, this.windDirection.x);
      
      const x = camPos.x + upwindOffset.x + (Math.random() - 0.5) * 40 * crossWind.x;
      const y = Math.random() * 5 + 2;
      const z = camPos.z + upwindOffset.z + (Math.random() - 0.5) * 40 * crossWind.z;

      positions.setXYZ(i, x, y, z);
      
      // Velocity: Wind dir + some downward flutter
      const speed = Math.random() * 5 + 8;
      velocities.setXYZ(i, 
        this.windDirection.x * speed,
        (Math.random() - 0.5) * 2 - 1.0, // Falling
        this.windDirection.z * speed
      );
      
      opacities.setX(i, 1.0);
    }
    
    positions.needsUpdate = true;
    velocities.needsUpdate = true;
    opacities.needsUpdate = true;
    
    // Stop gust after 5 seconds
    setTimeout(() => {
      this.isGusting = false;
    }, 5000);
  }

  private updateParticles(dt: number): void {
    const positions = this.particleSystem.geometry.attributes.position;
    const velocities = this.particleSystem.geometry.attributes.velocity;
    
    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i);
      if (y > -100) { // If active
        positions.setX(i, positions.getX(i) + velocities.getX(i) * dt);
        positions.setY(i, y + velocities.getY(i) * dt);
        positions.setZ(i, positions.getZ(i) + velocities.getZ(i) * dt);
      }
    }
    positions.needsUpdate = true;
  }
}
