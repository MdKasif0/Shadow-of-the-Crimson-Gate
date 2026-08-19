export class HealthSystem {
  public hp: number;
  public maxHp: number;
  public isDead: boolean = false;

  constructor(maxHp: number) {
    this.maxHp = maxHp;
    this.hp = maxHp;
  }

  public takeDamage(amount: number): void {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.isDead = true;
  }

  public heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    if (this.hp > 0) this.isDead = false;
  }

  public reset(): void {
    this.hp = this.maxHp;
    this.isDead = false;
  }

  public getPercent(): number { return this.hp / this.maxHp; }
}
