export enum MovementState {
  IDLE,
  WALK,
  DASH
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
  
  public isAttacking(): boolean {
    return this.combatPhase !== CombatPhase.NONE;
  }

  public canMove(): boolean {
    // Normal movement is disabled while attacking, except for the attack lunge
    return !this.isAttacking();
  }
}
