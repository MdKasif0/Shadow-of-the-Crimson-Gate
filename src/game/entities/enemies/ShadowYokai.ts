import { Enemy } from './Enemy';

export class ShadowYokai extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'ShadowYokai');
    this.health = 80;
    this.maxHealth = 80;
    this.speed = 60;
    this.damage = 15;
  }

  public updateEntity(time: number, delta: number): void {
    // Shadow Yokai logic
  }

  public attack(): void {}
  public takeDamage(amount: number): void {}
  public die(): void { this.destroy(); }
}
