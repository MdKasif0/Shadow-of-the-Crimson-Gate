import { EventBus } from '../core/EventBus';

export class PlayerProgress {
  public spiritEssence: number = 0;
  public level: number = 1;
  public clearedEncounters: Set<string> = new Set();
  public crimsonOniDefeated: boolean = false;
  
  private levelThresholds = [0, 50, 120];

  constructor() {
    // Initialized from SaveManager during load
  }

  public initFromSave(data: any): void {
    if (data.spiritEssence) this.spiritEssence = data.spiritEssence;
    if (data.level) this.level = data.level;
    if (data.clearedEncounters) this.clearedEncounters = new Set(data.clearedEncounters);
    if (data.crimsonOniDefeated) this.crimsonOniDefeated = data.crimsonOniDefeated;
  }

  public addEssence(amount: number): void {
    this.spiritEssence += amount;
    EventBus.emit('essenceUpdate', { amount: this.spiritEssence, added: amount });
    
    if (this.checkLevelUp()) {
      EventBus.emit('levelUp', { level: this.level });
    }
    EventBus.emit('requestSave', {});
  }

  public checkLevelUp(): boolean {
    if (this.level >= this.levelThresholds.length) return false;
    
    if (this.spiritEssence >= this.levelThresholds[this.level]) {
      this.level++;
      return true;
    }
    return false;
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
    this.level = 1;
    this.clearedEncounters.clear();
    this.crimsonOniDefeated = false;
  }
}
