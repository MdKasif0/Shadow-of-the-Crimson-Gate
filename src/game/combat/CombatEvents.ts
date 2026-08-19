export interface CombatEventListener {
  onAttackStarted?: (attackId: string) => void;
  onAttackActive?: (attackId: string) => void;
  onAttackFinished?: (attackId: string) => void;
  onComboWindowOpened?: () => void;
}

export class CombatEvents {
  private listeners: CombatEventListener[] = [];

  public addListener(listener: CombatEventListener): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: CombatEventListener): void {
    const idx = this.listeners.indexOf(listener);
    if (idx > -1) {
      this.listeners.splice(idx, 1);
    }
  }

  public emitAttackStarted(attackId: string): void {
    for (const l of this.listeners) if (l.onAttackStarted) l.onAttackStarted(attackId);
  }

  public emitAttackActive(attackId: string): void {
    for (const l of this.listeners) if (l.onAttackActive) l.onAttackActive(attackId);
  }

  public emitAttackFinished(attackId: string): void {
    for (const l of this.listeners) if (l.onAttackFinished) l.onAttackFinished(attackId);
  }

  public emitComboWindowOpened(): void {
    for (const l of this.listeners) if (l.onComboWindowOpened) l.onComboWindowOpened();
  }
}
