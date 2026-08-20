import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { EncounterManager } from '../encounters/EncounterManager';

export class EncounterTelegraphVFX {
  private scene: THREE.Scene;
  private particleSystems: Map<string, THREE.Points> = new Map();
  private activeRings: Map<string, THREE.Mesh> = new Map();
  private encounterManager: EncounterManager;

  constructor(scene: THREE.Scene, encounterManager: EncounterManager) {
    this.scene = scene;
    this.encounterManager = encounterManager;

    // Create a particle system for each registered encounter
    const encounters = encounterManager.getAllEncounters();
    
    // We need a simple glowing material for spirits/petals
    const map = this.createCircleTexture();
    const material = new THREE.PointsMaterial({
      size: 0.3,
      map: map,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      color: 0x6b1111 // Crimson spirit particles
    });

    for (const enc of encounters) {
      // Create 50 particles per encounter zone
      const count = 50;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const phases = new Float32Array(count); // For drifting animation

      const radius = enc.config.activationRadius * 0.8;

      for (let i = 0; i < count; i++) {
        // Random placement within a disk
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        positions[i * 3 + 0] = enc.config.center.x + Math.cos(angle) * r;
        positions[i * 3 + 1] = Math.random() * 3 + 0.5; // Height
        positions[i * 3 + 2] = enc.config.center.z + Math.sin(angle) * r;

        phases[i] = Math.random() * Math.PI * 2;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

      const points = new THREE.Points(geometry, material.clone());
      this.scene.add(points);
      this.particleSystems.set(enc.config.id, points);
    }

    EventBus.on('encounterStarted', (data: any) => {
      const ps = this.particleSystems.get(data.id);
      if (ps) ps.visible = false;
      const ring = this.activeRings.get(data.id);
      if (ring) ring.visible = false;
    });

    EventBus.on('encounterComplete', (data: any) => {
      const ps = this.particleSystems.get(data.id);
      if (ps) ps.visible = false;
      const ring = this.activeRings.get(data.id);
      if (ring) ring.visible = false;
    });
  }

  public update(dt: number, time: number): void {
    const encounters = this.encounterManager.getAllEncounters();
    for (const enc of encounters) {
      // Changed from enc.isCleared() to checking the state property
      if (enc.state === 3) continue; // EncounterState.COMPLETED

      let mesh = this.activeRings.get(enc.config.id);
      if (!mesh) {
        mesh = this.createRing(enc.config.activationRadius);
        mesh.position.copy(enc.config.center);
        // Slightly above ground
        mesh.position.y = 0.1;
        this.scene.add(mesh);
        this.activeRings.set(enc.config.id, mesh);
      }
    }

    for (const ps of this.particleSystems.values()) {
      if (!ps.visible) continue;
      
      const positions = ps.geometry.attributes.position;
      const phases = ps.geometry.attributes.phase;

      for (let i = 0; i < positions.count; i++) {
        // Gentle drift up and down
        let y = positions.getY(i);
        const phase = phases.getX(i);
        y += Math.sin(time * 2 + phase) * 0.01;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }
  }

  private createRing(radius: number): THREE.Mesh {
    const geometry = new THREE.RingGeometry(radius - 0.1, radius, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2;
    return ring;
  }

  private createCircleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    return new THREE.CanvasTexture(canvas);
  }
}
