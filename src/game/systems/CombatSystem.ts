import { Enemy } from '../entities/enemies/Enemy';
import { Player } from '../entities/Player';

export class CombatSystem {
  constructor() {}

  public processPlayerAttack(player: Player, enemies: Enemy[]): void {
    // Hit detection logic
  }

  public processEnemyAttack(enemy: Enemy, player: Player): void {
    // Enemy hit logic
  }
}
