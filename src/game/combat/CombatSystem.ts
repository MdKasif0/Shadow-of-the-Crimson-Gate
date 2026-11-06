import { PlayerState, CombatPhase } from './PlayerState';
import { ATTACK_DATA, COMBO_WINDOW_START, AttackDefinition } from './AttackData';
import { CombatEvents } from './CombatEvents';
import { AudioManager } from '../audio/AudioManager';

export class CombatSystem {
  public state: PlayerState;
  public events: CombatEvents;
  
  private attackTimer: number = 0;
  private inputBuffer: boolean = false;
  private comboWindowActive: boolean = false;
  private currentAttackDef: AttackDefinition | null = null;
  private comboIndex: number = 0;
  private queuedAttackId: string | null = null;

  constructor(state: PlayerState) {
    this.state = state;
    this.events = new CombatEvents();
  }

  public registerAttackInput(): void {
    if (this.state.combatPhase === CombatPhase.NONE) {
      this.comboIndex = 0;
      this.startAttack('ATTACK_1');
    } else if (this.comboWindowActive) {
      this.inputBuffer = true;
    }
  }

  /** Starts a heavy attack now, or queues it during a combo's window. */
  public registerHeavyInput(): void {
    if (this.state.combatPhase === CombatPhase.NONE) {
      this.comboIndex = 2;
      this.startAttack('ATTACK_HEAVY');
    } else if (this.comboWindowActive) {
      this.queuedAttackId = 'ATTACK_HEAVY';
    }
  }

  /** Starts immediately, cancelling whatever the player was doing. */
  public startSpecial(attackId: string): void {
    this.comboIndex = 2;
    this.startAttack(attackId);
  }

  private startAttack(attackId: string): void {
    this.currentAttackDef = ATTACK_DATA[attackId];
    if (!this.currentAttackDef) return;

    AudioManager.playPlayerAttack(this.comboIndex);

    this.state.currentAttackId = attackId;
    this.state.combatPhase = CombatPhase.WINDUP;
    this.attackTimer = 0;
    this.inputBuffer = false;
    this.queuedAttackId = null;
    this.comboWindowActive = false;

    this.events.emitAttackStarted(attackId);
    this.comboIndex++;
  }

  public update(dt: number): void {
    if (this.state.combatPhase === CombatPhase.NONE || !this.currentAttackDef) return;

    this.attackTimer += dt;

    switch (this.state.combatPhase) {
      case CombatPhase.WINDUP:
        if (this.attackTimer >= this.currentAttackDef.windup) {
          this.state.combatPhase = CombatPhase.ACTIVE;
          this.attackTimer = 0;
          this.events.emitAttackActive(this.currentAttackDef.id);
        }
        break;

      case CombatPhase.ACTIVE:
        if (this.attackTimer >= this.currentAttackDef.active) {
          this.state.combatPhase = CombatPhase.RECOVERY;
          this.attackTimer = 0;
        }
        break;

      case CombatPhase.RECOVERY:
        const recoveryProgress = this.attackTimer / this.currentAttackDef.recovery;
        
        // Open combo window
        if (!this.comboWindowActive && recoveryProgress >= COMBO_WINDOW_START) {
          this.comboWindowActive = true;
          this.events.emitComboWindowOpened();
        }

        if (this.comboWindowActive && this.queuedAttackId) {
          this.startAttack(this.queuedAttackId);
          return;
        }

        // Process buffered input if combo window is open
        if (this.comboWindowActive && this.inputBuffer && this.currentAttackDef.nextAttackId) {
          this.startAttack(this.currentAttackDef.nextAttackId);
          return; // state changed, break out
        }

        // End of recovery
        if (this.attackTimer >= this.currentAttackDef.recovery) {
          this.endCombat();
        }
        break;
    }
  }

  private endCombat(): void {
    if (this.state.currentAttackId) {
      this.events.emitAttackFinished(this.state.currentAttackId);
    }
    this.state.combatPhase = CombatPhase.NONE;
    this.state.currentAttackId = null;
    this.currentAttackDef = null;
    this.inputBuffer = false;
    this.queuedAttackId = null;
    this.comboWindowActive = false;
  }
}
