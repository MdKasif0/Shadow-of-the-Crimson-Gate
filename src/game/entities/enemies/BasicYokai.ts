import { Enemy } from './Enemy';
import { ASSET_PATHS } from '../../config/assetConfig';

export class BasicYokai extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'BasicYokai');
    this.health = 50;
    this.maxHealth = 50;
    this.speed = 40;
    this.damage = 5;
  }

  public updateEntity(time: number, delta: number): void {
    // Basic chase logic
  }

  public attack(): void {
    // Basic attack logic
  }

  public takeDamage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) this.die();
  }

  public die(): void {
    this.destroy();
  }
}
