import { BuildModifiers } from './PlayerBuild';

const BASE_HEALTH = 100;
const BASE_DASH_COOLDOWN = 0.6;

/** The Ronin's numbers, worked out from the skills and charms chosen. */
export class PlayerStats {
  public maxHealth: number = BASE_HEALTH;
  public attackPower: number = 1.0;
  public dashCooldown: number = BASE_DASH_COOLDOWN;

  public apply(modifiers: BuildModifiers): void {
    this.maxHealth = BASE_HEALTH + modifiers.maxHealthBonus;
    this.attackPower = modifiers.damage;
    this.dashCooldown = BASE_DASH_COOLDOWN * modifiers.dashCooldown;
  }
}
