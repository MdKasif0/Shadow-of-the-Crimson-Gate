// ─── Story State ────────────────────────────────────────────────────────────
// Holds current chapter, active flags, completed objectives. Serializable.

import { ChapterId } from './StoryChapter';
import { StoryFlags, createDefaultFlags } from './StoryFlag';

export class StoryState {
  public currentChapter: ChapterId = ChapterId.CHAPTER_1;
  public flags: StoryFlags = createDefaultFlags();
  public completedObjectives: Set<string> = new Set();
  public introPlayed: boolean = false;

  public setFlag(key: keyof StoryFlags, value: boolean): void {
    this.flags[key] = value;
  }

  public getFlag(key: keyof StoryFlags): boolean {
    return this.flags[key];
  }

  public completeObjective(id: string): void {
    this.completedObjectives.add(id);
  }

  public isObjectiveComplete(id: string): boolean {
    return this.completedObjectives.has(id);
  }

  public serialize(): string {
    return JSON.stringify({
      currentChapter: this.currentChapter,
      flags: this.flags,
      completedObjectives: Array.from(this.completedObjectives),
      introPlayed: this.introPlayed,
    });
  }

  public deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.currentChapter) this.currentChapter = parsed.currentChapter;
      if (parsed.flags) this.flags = { ...createDefaultFlags(), ...parsed.flags };
      if (parsed.completedObjectives) this.completedObjectives = new Set(parsed.completedObjectives);
      if (parsed.introPlayed !== undefined) this.introPlayed = parsed.introPlayed;
    } catch (e) {
      console.warn('Failed to deserialize StoryState', e);
    }
  }

  public reset(): void {
    this.currentChapter = ChapterId.CHAPTER_1;
    this.flags = createDefaultFlags();
    this.completedObjectives.clear();
    this.introPlayed = false;
  }
}
