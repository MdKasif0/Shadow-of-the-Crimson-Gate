import { Difficulty } from './Run';

/**
 * Records — What carries across every save slot: achievements, lifetime
 * counters, whether Crimson difficulty is open, and the Trials high scores.
 */

const KEY = 'shadow-crimson-records';
const TOP = 5;

export interface BossRushRecord { time: number; difficulty: Difficulty; date: number }
export interface ArenaRecord { waves: number; kills: number; date: number }

interface RecordsData {
  crimsonUnlocked: boolean;
  achievements: Record<string, number>;
  counters: Record<string, number>;
  bossRush: BossRushRecord[];
  arena: ArenaRecord[];
}

const empty = (): RecordsData => ({ crimsonUnlocked: false, achievements: {}, counters: {}, bossRush: [], arena: [] });

class RecordsStore {
  private data: RecordsData = empty();

  constructor() {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) this.data = { ...empty(), ...JSON.parse(stored) };
    } catch {
      this.data = empty();
    }
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Records are a nicety; play goes on without them
    }
  }

  public get crimsonUnlocked(): boolean {
    return this.data.crimsonUnlocked;
  }

  public unlockCrimson(): void {
    if (this.data.crimsonUnlocked) return;
    this.data.crimsonUnlocked = true;
    this.save();
  }

  public hasAchievement(id: string): boolean {
    return id in this.data.achievements;
  }

  public achievedAt(id: string): number | null {
    return this.data.achievements[id] ?? null;
  }

  /** Returns true the first time. */
  public grantAchievement(id: string): boolean {
    if (this.hasAchievement(id)) return false;
    this.data.achievements[id] = Date.now();
    this.save();
    return true;
  }

  public counter(id: string): number {
    return this.data.counters[id] ?? 0;
  }

  public addToCounter(id: string, amount = 1): number {
    const value = this.counter(id) + amount;
    this.data.counters[id] = value;
    this.save();
    return value;
  }

  public get bossRush(): readonly BossRushRecord[] {
    return this.data.bossRush;
  }

  public get arena(): readonly ArenaRecord[] {
    return this.data.arena;
  }

  /** Adds a Boss Rush time. Returns its place in the table (1 is best), or null if it missed it. */
  public addBossRush(record: BossRushRecord): number | null {
    const list = [...this.data.bossRush, record].sort((a, b) => a.time - b.time).slice(0, TOP);
    this.data.bossRush = list;
    this.save();
    const place = list.indexOf(record);
    return place >= 0 ? place + 1 : null;
  }

  /** Adds an Arena run. Returns its place in the table (1 is best), or null if it missed it. */
  public addArena(record: ArenaRecord): number | null {
    const list = [...this.data.arena, record].sort((a, b) => b.waves - a.waves || b.kills - a.kills).slice(0, TOP);
    this.data.arena = list;
    this.save();
    const place = list.indexOf(record);
    return place >= 0 ? place + 1 : null;
  }
}

export const Records = new RecordsStore();
