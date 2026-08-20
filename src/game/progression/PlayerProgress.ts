import { EventBus } from '../core/EventBus';

export class PlayerProgress {
  public spiritEssence: number = 0;
  public level: number = 1;
  public clearedEncounters: Set<string> = new Set();
  
  private levelThresholds = [0, 50, 120];

  constructor() {
    this.load();
  }

  public addEssence(amount: number): void {
    this.spiritEssence += amount;
    EventBus.emit('essenceUpdate', { amount: this.spiritEssence, added: amount });
    
    if (this.checkLevelUp()) {
      EventBus.emit('levelUp', { level: this.level });
    }
    this.save();
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
    this.save();
  }

  public hasClearedEncounter(id: string): boolean {
    return this.clearedEncounters.has(id);
  }

  public save(): void {
    const data = {
      spiritEssence: this.spiritEssence,
      level: this.level,
      clearedEncounters: Array.from(this.clearedEncounters)
    };
    try {
      localStorage.setItem('sotcg_progress', JSON.stringify(data));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  }

  public load(): void {
    try {
      const dataStr = localStorage.getItem('sotcg_progress');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        this.spiritEssence = data.spiritEssence || 0;
        this.level = data.level || 1;
        this.clearedEncounters = new Set(data.clearedEncounters || []);
      }
    } catch (e) {
      console.warn("Could not load from localStorage", e);
    }
  }

  public wipe(): void {
    this.spiritEssence = 0;
    this.level = 1;
    this.clearedEncounters.clear();
    try {
      localStorage.removeItem('sotcg_progress');
    } catch (e) {}
  }
}
