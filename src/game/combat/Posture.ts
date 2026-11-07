/** How long a broken guard leaves an enemy open to an execution. */
export const GUARD_BREAK_SECONDS = 3;
/** Seconds without being hit before posture starts to recover. */
const RECOVERY_DELAY = 1.6;
/** Fraction of the maximum recovered per second, once recovery starts. */
const RECOVERY_RATE = 0.22;

/**
 * Posture — How close an enemy is to having its guard broken. Hits and parries
 * fill it; a full meter leaves the enemy open to an execution. It drains back
 * down if the pressure lets up.
 */
export class Posture {
  public value = 0;
  public brokenTimer = 0;
  private sinceHit = 0;

  constructor(public max: number) {}

  public get isBroken(): boolean {
    return this.brokenTimer > 0;
  }

  public get fraction(): number {
    return this.max > 0 ? this.value / this.max : 0;
  }

  /** Returns true when this pushes the guard to breaking. */
  public add(amount: number): boolean {
    if (this.isBroken || amount <= 0) return false;
    this.value = Math.min(this.max, this.value + amount);
    this.sinceHit = 0;
    if (this.value >= this.max) {
      this.brokenTimer = GUARD_BREAK_SECONDS;
      return true;
    }
    return false;
  }

  public update(dt: number): void {
    if (this.brokenTimer > 0) {
      this.brokenTimer -= dt;
      if (this.brokenTimer <= 0) this.value = 0;
      return;
    }
    this.sinceHit += dt;
    if (this.sinceHit > RECOVERY_DELAY) this.value = Math.max(0, this.value - this.max * RECOVERY_RATE * dt);
  }

  public reset(): void {
    this.value = 0;
    this.brokenTimer = 0;
    this.sinceHit = 0;
  }
}
