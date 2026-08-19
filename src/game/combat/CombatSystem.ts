import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';

export class CombatSystem {
  public comboIndex: number = 0;
  public attackTimer: number = 0;
  public isAttacking: boolean = false;
  public cooldownTimer: number = 0;
  private comboWindowTimer: number = 0;
  private queuedAttack: boolean = false;
  public phase: 'none' | 'windup' | 'active' | 'recovery' = 'none';

  public tryAttack(): boolean {
    if (this.isAttacking) {
      if (this.phase === 'recovery' || this.phase === 'active') {
        this.queuedAttack = true;
      }
      return false;
    }
    if (this.cooldownTimer > 0) return false;
    this.startAttack();
    return true;
  }

  private startAttack(): void {
    const combo = GAME_CONFIG.PLAYER.ATTACK.COMBO;
    if (this.comboIndex >= combo.length) this.comboIndex = 0;
    this.isAttacking = true;
    this.attackTimer = 0;
    this.phase = 'windup';
    this.queuedAttack = false;
  }

  public update(dt: number): void {
    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;
    if (this.comboWindowTimer > 0) {
      this.comboWindowTimer -= dt;
      if (this.comboWindowTimer <= 0) this.comboIndex = 0;
    }

    if (!this.isAttacking) return;

    this.attackTimer += dt;
    const combo = GAME_CONFIG.PLAYER.ATTACK.COMBO[this.comboIndex];
    const total = combo.windup + combo.active + combo.recovery;

    if (this.attackTimer < combo.windup) {
      this.phase = 'windup';
    } else if (this.attackTimer < combo.windup + combo.active) {
      this.phase = 'active';
    } else if (this.attackTimer < total) {
      this.phase = 'recovery';
    } else {
      // Attack finished
      this.isAttacking = false;
      this.phase = 'none';
      this.cooldownTimer = GAME_CONFIG.PLAYER.ATTACK.COOLDOWN;
      this.comboIndex++;
      this.comboWindowTimer = GAME_CONFIG.PLAYER.ATTACK.COMBO_WINDOW;

      if (this.queuedAttack && this.comboIndex < GAME_CONFIG.PLAYER.ATTACK.COMBO.length) {
        this.queuedAttack = false;
        this.startAttack();
      }
    }
  }

  public getAnimState(): string {
    if (!this.isAttacking) return 'idle';
    return `attack${this.comboIndex + 1}`;
  }

  public getCurrentDamage(): number {
    return GAME_CONFIG.PLAYER.ATTACK.DAMAGE[this.comboIndex] || 25;
  }

  public reset(): void {
    this.comboIndex = 0; this.attackTimer = 0;
    this.isAttacking = false; this.cooldownTimer = 0;
    this.comboWindowTimer = 0; this.phase = 'none'; this.queuedAttack = false;
  }
}
