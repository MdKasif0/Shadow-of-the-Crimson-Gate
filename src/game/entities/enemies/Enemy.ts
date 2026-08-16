export abstract class Enemy extends Phaser.GameObjects.Sprite {
  public health: number;
  public maxHealth: number;
  public speed: number;
  public damage: number;
  public detectionRange: number;
  public attackRange: number;
  public state: string;
  public target: Phaser.GameObjects.Sprite | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 50;
    this.damage = 10;
    this.detectionRange = 300;
    this.attackRange = 50;
    this.state = 'IDLE';
  }

  public abstract updateEntity(time: number, delta: number): void;
  public abstract attack(): void;
  public abstract takeDamage(amount: number): void;
  public abstract die(): void;
}
