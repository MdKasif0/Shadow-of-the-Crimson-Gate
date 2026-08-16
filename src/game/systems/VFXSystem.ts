export class VFXSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public playSlash(x: number, y: number, rotation: number): void {
    // To be implemented
  }

  public playHit(x: number, y: number): void {
    // To be implemented
  }

  public spawnSpirits(): void {
    const emitter = this.scene.add.particles(0, 0, 'VFXSpirits', {
      x: { min: 0, max: this.scene.scale.width * 2 },
      y: { min: 0, max: this.scene.scale.height * 2 },
      lifespan: { min: 2000, max: 4000 },
      speed: { min: 10, max: 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.1, end: 0.5 },
      alpha: { start: 0, end: 0.4 },
      blendMode: 'ADD',
      frequency: 500
    });
    emitter.setScrollFactor(0.8);
    // Bind to a layer later if needed, or set depth directly
    emitter.setDepth(250); 
  }

  public spawnSakuraPetals(): void {
    const emitter = this.scene.add.particles(0, 0, 'VFXPetals', {
      x: { min: -500, max: this.scene.scale.width * 2 },
      y: -100,
      lifespan: 10000,
      speedX: { min: 50, max: 150 },
      speedY: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      rotate: { start: 0, end: 360 },
      scale: { min: 0.2, max: 0.6 },
      alpha: { min: 0.4, max: 0.8 },
      frequency: 300
    });
    emitter.setScrollFactor(0.9);
    emitter.setDepth(251);
  }
}
