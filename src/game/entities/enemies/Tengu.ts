import { Enemy } from './Enemy';

export class Tengu extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'Tengu');
    this.health = 150;
    this.maxHealth = 150;
    this.speed = 80;
    this.damage = 25;
  }

  public updateEntity(time: number, delta: number): void {}
  public attack(): void {}
  public takeDamage(amount: number): void {}
  public die(): void { this.destroy(); }
}
