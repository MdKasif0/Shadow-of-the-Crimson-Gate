import * as THREE from 'three';

export class AtmosphereSystem {
  private scene: THREE.Scene;
  private time: number = 0;

  // Particles
  private petalsGroup: THREE.Group;
  private spiritsGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Fog (Cinematic dark teal/charcoal depth)
    this.scene.fog = new THREE.FogExp2(0x0a1118, 0.035);

    // 2. Procedural Particles
    this.petalsGroup = new THREE.Group();
    this.spiritsGroup = new THREE.Group();
    this.scene.add(this.petalsGroup);
    this.scene.add(this.spiritsGroup);

    this.initPetals();
    this.initSpirits();
  }

  private initPetals(): void {
    const count = 30; // Kept sparse as requested
    const geometry = new THREE.PlaneGeometry(0.2, 0.2);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffaaaa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });

    for (let i = 0; i < count; i++) {
      const petal = new THREE.Mesh(geometry, material);

      // Randomize initial positions
      petal.position.set(
        (Math.random() - 0.5) * 40,
        Math.random() * 15,
        (Math.random() - 0.5) * 40
      );

      // Store custom procedural data inside userData
      petal.userData = {
        speedY: 0.5 + Math.random() * 1.5,
        speedX: 0.2 + Math.random() * 0.8,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 1.0 + Math.random(),
        rotSpeedX: Math.random() * 2,
        rotSpeedY: Math.random() * 2,
      };

      this.petalsGroup.add(petal);
    }
  }

  private initSpirits(): void {
    const count = 15;
    const geometry = new THREE.PlaneGeometry(0.4, 0.4);
    const material = new THREE.MeshBasicMaterial({
      color: 0x88ffff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    for (let i = 0; i < count; i++) {
      const spirit = new THREE.Mesh(geometry, material);

      spirit.position.set(
        (Math.random() - 0.5) * 30,
        Math.random() * 5,
        (Math.random() - 0.5) * 30
      );

      spirit.userData = {
        speedY: 0.2 + Math.random() * 0.5,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random() * 0.5,
        baseY: spirit.position.y
      };

      this.spiritsGroup.add(spirit);
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    // Update Petals (falling, swaying)
    this.petalsGroup.children.forEach(child => {
      const petal = child as THREE.Mesh;
      const data = petal.userData;

      petal.position.y -= data.speedY * deltaTime;
      petal.position.x += (data.speedX + Math.sin(this.time * data.swaySpeed + data.swayPhase)) * deltaTime;

      petal.rotation.x += data.rotSpeedX * deltaTime;
      petal.rotation.y += data.rotSpeedY * deltaTime;

      // Recycle
      if (petal.position.y < -2) {
        petal.position.y = 15 + Math.random() * 5;
        petal.position.x = (Math.random() - 0.5) * 40;
      }
    });

    // Update Spirits (rising, pulsing)
    this.spiritsGroup.children.forEach(child => {
      const spirit = child as THREE.Mesh;
      const data = spirit.userData;

      spirit.position.y += data.speedY * deltaTime;
      spirit.position.x += Math.sin(this.time * data.swaySpeed + data.swayPhase) * deltaTime * 0.5;

      // Pulse opacity
      (spirit.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.3 * Math.sin(this.time * 2 + data.swayPhase);

      // Orient to face camera (Billboard approximation)
      // For a top-down orthogonal, laying them slightly flat or facing up works well
      spirit.rotation.x = -Math.PI / 4;

      // Recycle
      if (spirit.position.y > 10) {
        spirit.position.y = -1;
        spirit.position.x = (Math.random() - 0.5) * 30;
      }
    });
  }
}
