import { GameState } from '../state/GameState';

export class ProgressionSystem {
  public static addSouls(amount: number): void {
    GameState.getInstance().player.souls += amount;
  }

  public static unlockUpgrade(upgradeId: string): void {
    GameState.getInstance().player.upgrades.push(upgradeId);
  }
}
