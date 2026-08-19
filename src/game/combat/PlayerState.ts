export enum MovementState {
  IDLE,
  WALK,
  DASH,
  HURT,
  DEAD
}

export enum CombatPhase {
  NONE,
  WINDUP,
  ACTIVE,
  RECOVERY
}

export class PlayerState {
  public movement: MovementState = MovementState.IDLE;
  public combatPhase: CombatPhase = CombatPhase.NONE;
  public currentAttackId: string | null = null;
  public invulnerabilityTimer: number = 0;
  
  public isAttacking(): boolean {
    return this.combatPhase !== CombatPhase.NONE;
  }

  public canMove(): boolean {
    // Priority: DEAD > HURT > ATTACK > DASH > MOVEMENT
    if (this.movement === MovementState.DEAD) return false;
    if (this.movement === MovementState.HURT) return false;
    if (this.movement === MovementState.DASH) return false;
    return !this.isAttacking();
  }

  public isInvulnerable(): boolean {
    return this.invulnerabilityTimer > 0 || this.movement === MovementState.DASH || this.movement === MovementState.DEAD;
  }
}
