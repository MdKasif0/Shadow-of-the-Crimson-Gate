export interface HealthEventPayload {
  current: number;
  max: number;
  delta: number;
  sourceId?: string;
}

export type HealthListener = (event: HealthEventPayload) => void;

export class HealthComponent {
  public maxHealth: number;
  public currentHealth: number;
  public isDead: boolean = false;

  private onDamageListeners: HealthListener[] = [];
  private onDeathListeners: HealthListener[] = [];

  constructor(maxHealth: number) {
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
  }

  public takeDamage(amount: number, sourceId?: string): void {
    if (this.isDead) return;

    this.currentHealth -= amount;
    
    const payload: HealthEventPayload = {
      current: this.currentHealth,
      max: this.maxHealth,
      delta: -amount,
      sourceId
    };

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.isDead = true;
      this.emit(this.onDamageListeners, payload);
      this.emit(this.onDeathListeners, payload);
    } else {
      this.emit(this.onDamageListeners, payload);
    }
  }

  public heal(amount: number): void {
    if (this.isDead) return;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }

  public getHealthPercent(): number {
    return this.maxHealth > 0 ? this.currentHealth / this.maxHealth : 0;
  }

  public onDamage(listener: HealthListener): void {
    this.onDamageListeners.push(listener);
  }

  public onDeath(listener: HealthListener): void {
    this.onDeathListeners.push(listener);
  }

  private emit(listeners: HealthListener[], payload: HealthEventPayload): void {
    for (const l of listeners) {
      l(payload);
    }
  }
}
