import { Enemy } from './Enemy';

export class CrimsonOni extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'CrimsonOni');
    this.health = 1000;
    this.maxHealth = 1000;
    this.speed = 30;
    this.damage = 40;
  }

  public updateEntity(time: number, delta: number): void {}
  public attack(): void {}
  public takeDamage(amount: number): void {}
  public die(): void { this.destroy(); }
}
