export class PlayerStats {
  public maxHealth: number = 100;
  public attackPower: number = 1.0;
  public dashCooldown: number = 0.6;
  public movementSpeed: number = 4.0;

  constructor(level: number) {
    this.applyLevel(level);
  }

  public applyLevel(level: number): void {
    // Reset to base
    this.maxHealth = 100;
    this.attackPower = 1.0;
    this.dashCooldown = 0.6;
    this.movementSpeed = 4.0;

    // Apply modest bonuses
    if (level >= 2) {
      this.maxHealth += 10;
      this.attackPower += 0.05;
    }
    if (level >= 3) {
      this.maxHealth += 10;
      this.attackPower += 0.05;
      this.dashCooldown -= 0.05;
    }
  }
}
