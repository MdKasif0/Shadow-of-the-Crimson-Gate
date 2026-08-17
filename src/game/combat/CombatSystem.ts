import * as THREE from 'three';
import { PlayerCombatState, CombatEvent } from './CombatState';
import { AttackController } from './AttackController';

export class CombatSystem {
  private attackController: AttackController;
  private attackDirection: THREE.Vector3 = new THREE.Vector3();
  
  // Callbacks for external systems (Player, Animation, etc)
  public onAttackStarted?: (direction: THREE.Vector3) => void;
  public onAttackActive?: () => void;
  public onAttackFinished?: () => void;

  constructor() {
    this.attackController = new AttackController(this.handleCombatEvent.bind(this));
  }

  public update(deltaTime: number): void {
    this.attackController.update(deltaTime);
  }

  public tryAttack(currentFacingDirection: THREE.Vector3): boolean {
    if (this.attackController.startAttack()) {
      // Capture direction at the moment attack starts
      this.attackDirection.copy(currentFacingDirection).normalize();
      return true;
    }
    return false;
  }

  private handleCombatEvent(event: CombatEvent): void {
    switch (event) {
      case CombatEvent.ATTACK_STARTED:
        if (this.onAttackStarted) this.onAttackStarted(this.attackDirection);
        break;
      case CombatEvent.ATTACK_ACTIVE:
        if (this.onAttackActive) this.onAttackActive();
        break;
      case CombatEvent.ATTACK_FINISHED:
        if (this.onAttackFinished) this.onAttackFinished();
        break;
    }
  }

  public getPlayerState(): PlayerCombatState {
    return this.attackController.getState();
  }

  public isAttacking(): boolean {
    return this.attackController.isAttacking();
  }

  public getAttackTimer(): number {
    return this.attackController.getTimer();
  }
}
