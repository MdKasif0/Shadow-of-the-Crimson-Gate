// ─── Objective Manager (Data-Driven) ────────────────────────────────────────
// Accepts objectives from StoryManager. Emits objectiveUpdate on EventBus.

import { EventBus } from '../core/EventBus';
import { Objective } from '../objectives/Objective';
import { StoryEvents } from '../story/StoryEvent';
import { AudioManager } from '../audio/AudioManager';
import { AudioId } from '../audio/AudioRegistry';

export class ObjectiveManager {
  private activeObjective: Objective | null = null;
  private completedObjectives: Set<string> = new Set();

  constructor() {
    EventBus.on(StoryEvents.OBJECTIVE_START, (data: { objective: Objective }) => {
      this.setObjective(data.objective);
    });

    EventBus.on(StoryEvents.OBJECTIVE_COMPLETE, () => {
      this.completeActive();
    });

    // Legacy support: listen to zone and encounter events
    EventBus.on('encounterComplete', (data: { id: string }) => {
      if (this.activeObjective && this.activeObjective.encounterId === data.id) {
        this.completeActive();
      }
    });

    EventBus.on('bossDeath', () => {
      if (this.activeObjective && this.activeObjective.type === 'DEFEAT_BOSS') {
        this.completeActive();
      }
    });
  }

  public setObjective(objective: Objective): void {
    this.activeObjective = objective;
    AudioManager.play(AudioId.UI_NOTIFICATION, { cooldownMs: 500 });
    EventBus.emit('objectiveUpdate', { text: objective.description });
  }

  public completeActive(): void {
    if (this.activeObjective) {
      AudioManager.play(AudioId.UI_CONFIRM, { cooldownMs: 500 });
      this.activeObjective.isComplete = true;
      this.completedObjectives.add(this.activeObjective.id);
      this.activeObjective = null;
    }
  }

  public getActive(): Objective | null {
    return this.activeObjective;
  }

  public isComplete(id: string): boolean {
    return this.completedObjectives.has(id);
  }

  /** Called each frame from GameScene — check zone-based objectives */
  public onZoneEntered(zoneId: string): void {
    if (!this.activeObjective) return;
    if (this.activeObjective.zoneId && this.activeObjective.zoneId === zoneId) {
      // Zone reached — StoryManager will handle the actual completion
    }
  }

  public reset(): void {
    this.activeObjective = null;
    this.completedObjectives.clear();
  }
}
