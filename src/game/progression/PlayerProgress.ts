import { EventBus } from '../core/EventBus';

/** Spirit Essence, the currency spent at shrines, and which fights are done. */
export class PlayerProgress {
  public spiritEssence: number = 0;
  public clearedEncounters: Set<string> = new Set();
  public crimsonOniDefeated: boolean = false;

  public initFromSave(data: any): void {
    this.spiritEssence = data.spiritEssence ?? 0;
    this.clearedEncounters = new Set(data.clearedEncounters ?? []);
    this.crimsonOniDefeated = !!data.crimsonOniDefeated;
  }

  public addEssence(amount: number): void {
    if (amount <= 0) return;
    this.spiritEssence += amount;
    EventBus.emit('essenceUpdate', { amount: this.spiritEssence, added: amount });
  }

  /** Takes essence away, for spending or for losing it on death. Returns what was taken. */
  public removeEssence(amount: number): number {
    const taken = Math.min(amount, this.spiritEssence);
    this.spiritEssence -= taken;
    EventBus.emit('essenceUpdate', { amount: this.spiritEssence, added: -taken });
    return taken;
  }

  public completeEncounter(id: string): void {
    this.clearedEncounters.add(id);
    EventBus.emit('requestSave', {});
  }

  public hasClearedEncounter(id: string): boolean {
    return this.clearedEncounters.has(id);
  }

  public wipe(): void {
    this.spiritEssence = 0;
    this.clearedEncounters.clear();
    this.crimsonOniDefeated = false;
  }
}
