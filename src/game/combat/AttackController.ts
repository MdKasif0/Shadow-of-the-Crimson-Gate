import { COMBAT_CONFIG } from '../config/combatConfig';
import { PlayerCombatState, CombatEvent } from './CombatState';

export type CombatEventCallback = (event: CombatEvent) => void;

export class AttackController {
  private state: PlayerCombatState = PlayerCombatState.IDLE;
  private timer: number = 0;
  private cooldownTimer: number = 0;
  private onEvent: CombatEventCallback;

  constructor(onEvent: CombatEventCallback) {
    this.onEvent = onEvent;
  }

  public startAttack(): boolean {
    if (this.state !== PlayerCombatState.IDLE || this.cooldownTimer > 0) {
      return false;
    }

    this.state = PlayerCombatState.ATTACK_WINDUP;
    this.timer = COMBAT_CONFIG.PLAYER.ATTACK.WINDUP;
    this.onEvent(CombatEvent.ATTACK_STARTED);
    return true;
  }

  public update(deltaTime: number): void {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= deltaTime;
    }

    if (this.state === PlayerCombatState.IDLE) return;

    this.timer -= deltaTime;

    if (this.timer <= 0) {
      this.advanceState();
    }
  }

  private advanceState(): void {
    switch (this.state) {
      case PlayerCombatState.ATTACK_WINDUP:
        this.state = PlayerCombatState.ATTACK_ACTIVE;
        this.timer = COMBAT_CONFIG.PLAYER.ATTACK.ACTIVE;
        this.onEvent(CombatEvent.ATTACK_ACTIVE);
        break;
      
      case PlayerCombatState.ATTACK_ACTIVE:
        this.state = PlayerCombatState.ATTACK_RECOVERY;
        this.timer = COMBAT_CONFIG.PLAYER.ATTACK.RECOVERY;
        break;

      case PlayerCombatState.ATTACK_RECOVERY:
        this.state = PlayerCombatState.IDLE;
        this.timer = 0;
        this.cooldownTimer = COMBAT_CONFIG.PLAYER.ATTACK.COOLDOWN;
        this.onEvent(CombatEvent.ATTACK_FINISHED);
        break;
    }
  }

  public getState(): PlayerCombatState {
    return this.state;
  }

  public getTimer(): number {
    return this.timer;
  }

  public isAttacking(): boolean {
    return this.state !== PlayerCombatState.IDLE;
  }
}
