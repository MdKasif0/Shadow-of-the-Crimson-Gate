// ─── Story Manager ──────────────────────────────────────────────────────────
// Central orchestrator. Listens to zone changes, encounters, boss events.
// Advances chapters, sets flags, triggers dialogue/objectives.

import { EventBus } from '../core/EventBus';
import { StoryState } from './StoryState';
import { StoryEvents } from './StoryEvent';
import { ChapterId, CHAPTERS } from './StoryChapter';
import { StoryFlags } from './StoryFlag';
import { StoryIntro } from './StoryIntro';
import { Objective } from '../objectives/Objective';
import { ObjectiveType } from '../objectives/ObjectiveType';

export class StoryManager {
  public state: StoryState;
  private intro: StoryIntro;
  private lastZoneId: string = '';
  private introRunning: boolean = false;
  private chapterShown: Set<ChapterId> = new Set();

  constructor() {
    this.state = new StoryState();
    this.intro = new StoryIntro();

    // Listen for encounter completions
    EventBus.on('encounterComplete', (data: { id: string }) => {
      this.onEncounterComplete(data.id);
    });

    // Listen for boss death
    EventBus.on('bossDeath', () => {
      this.state.setFlag('crimsonOniDefeated', true);
      this.completeCurrentObjective();
      this.advanceToChapter(ChapterId.EPILOGUE);

      // Start the 30 second Epilogue sequence
      setTimeout(() => {
        this.state.setFlag('endingStarted', true);
        EventBus.emit('epilogueSequenceStart', {});
      }, 5000); // 5 seconds after death, start the epilogue visuals
      
      setTimeout(() => {
        this.state.setFlag('completedCampaign', true);
        EventBus.emit('requestSave', {});
        EventBus.emit('epilogueSequenceEnd', {});
      }, 35000); // 35 seconds total
    });

    // Listen for shrine activation
    EventBus.on('shrineActivated', () => {
      this.state.setFlag('shrineActivated', true);
      if (this.state.currentChapter === ChapterId.CHAPTER_3) {
        this.completeCurrentObjective();
        this.setObjective({
          id: 'obj_find_source',
          type: ObjectiveType.REACH_LOCATION,
          description: 'FIND THE SOURCE OF THE CORRUPTION',
          zoneId: 'TEMPLE_APPROACH',
          isComplete: false,
        });
      }
    });

    // Listen for dialogue end — set metShrineKeeper flag
    EventBus.on(StoryEvents.DIALOGUE_END, () => {
      if (!this.state.getFlag('metShrineKeeper')) {
        this.state.setFlag('metShrineKeeper', true);
        // After first NPC talk, set the courtyard objective
        this.setObjective({
          id: 'obj_investigate_courtyard',
          type: ObjectiveType.DEFEAT_ENEMIES,
          description: 'INVESTIGATE THE CORRUPTED COURTYARD',
          encounterId: 'enc_courtyard',
          isComplete: false,
        });
      }
    });
  }

  public get flags(): StoryFlags {
    return this.state.flags;
  }

  /** Called once at start. Plays intro if needed, then chapter 1. */
  public async startGame(): Promise<void> {
    if (!this.state.introPlayed) {
      this.introRunning = true;
      await this.intro.play();
      this.state.introPlayed = true;
      this.introRunning = false;
    }

    // Show Chapter 1 title
    this.advanceToChapter(ChapterId.CHAPTER_1);

    // Set first objective
    this.setObjective({
      id: 'obj_reach_shrine',
      type: ObjectiveType.REACH_LOCATION,
      description: 'REACH THE ABANDONED SHRINE',
      zoneId: 'SHRINE',
      isComplete: false,
    });
  }

  public get isIntroRunning(): boolean {
    return this.introRunning;
  }

  /** Called each frame from GameScene with current zone ID. */
  public onZoneChanged(zoneId: string): void {
    if (zoneId === this.lastZoneId) return;
    this.lastZoneId = zoneId;

    EventBus.emit(StoryEvents.STORY_TRIGGER, { zone: zoneId });

    switch (zoneId) {
      case 'ENTRANCE':
        if (!this.state.getFlag('enteredMountain')) {
          this.state.setFlag('enteredMountain', true);
        }
        break;

      case 'FOREST':
        if (this.state.currentChapter === ChapterId.CHAPTER_1 && this.state.getFlag('courtyardPurified')) {
          this.advanceToChapter(ChapterId.CHAPTER_2);
          this.setObjective({
            id: 'obj_forest_spirits',
            type: ObjectiveType.DEFEAT_ENEMIES,
            description: 'FOLLOW THE SPIRIT LIGHTS INTO THE FOREST',
            isComplete: false,
          });
        }
        break;

      case 'SHRINE':
        if (this.state.currentChapter === ChapterId.CHAPTER_2 || 
            (this.state.currentChapter === ChapterId.CHAPTER_1 && !this.state.getFlag('metShrineKeeper'))) {
          if (!this.state.getFlag('shrineActivated')) {
            this.advanceToChapter(ChapterId.CHAPTER_3);
            this.setObjective({
              id: 'obj_activate_shrine',
              type: ObjectiveType.INTERACT_SHRINE,
              description: 'ACTIVATE THE ANCIENT SHRINE',
              isComplete: false,
            });
          }
        }
        break;

      case 'TEMPLE_APPROACH':
        if (!this.state.getFlag('templeReached')) {
          this.state.setFlag('templeReached', true);
          this.completeCurrentObjective();
          this.setObjective({
            id: 'obj_enter_gate',
            type: ObjectiveType.ENTER_ARENA,
            description: 'ENTER THE CRIMSON GATE',
            zoneId: 'BOSS_ARENA',
            isComplete: false,
          });
        }
        break;

      case 'BOSS_ARENA':
        if (this.state.currentChapter !== ChapterId.EPILOGUE) {
          this.advanceToChapter(ChapterId.CHAPTER_4);
          this.completeCurrentObjective();
          this.setObjective({
            id: 'obj_defeat_oni',
            type: ObjectiveType.DEFEAT_BOSS,
            description: 'DEFEAT THE CRIMSON ONI',
            isComplete: false,
          });
        }
        break;
    }
  }

  private onEncounterComplete(encounterId: string): void {
    if (encounterId.includes('courtyard')) {
      this.state.setFlag('courtyardPurified', true);
      this.completeCurrentObjective();
      this.setObjective({
        id: 'obj_reach_forest',
        type: ObjectiveType.REACH_LOCATION,
        description: 'CONTINUE DEEPER INTO THE FOREST',
        zoneId: 'FOREST',
        isComplete: false,
      });
    } else if (encounterId === 'enc_forest_2') {
      this.state.setFlag('forestPurified', true);
      this.completeCurrentObjective();
    }
  }

  private advanceToChapter(chapter: ChapterId): void {
    if (this.chapterShown.has(chapter)) return;
    this.chapterShown.add(chapter);

    const prevChapter = this.state.currentChapter;
    this.state.currentChapter = chapter;

    if (prevChapter !== chapter) {
      EventBus.emit(StoryEvents.CHAPTER_COMPLETE, { chapter: CHAPTERS[prevChapter] });
    }

    EventBus.emit(StoryEvents.CHAPTER_START, { chapter: CHAPTERS[chapter] });
  }

  private setObjective(objective: Objective): void {
    EventBus.emit(StoryEvents.OBJECTIVE_START, { objective });
    EventBus.emit('objectiveUpdate', { text: objective.description });
  }

  private completeCurrentObjective(): void {
    EventBus.emit(StoryEvents.OBJECTIVE_COMPLETE, {});
  }

  public reset(): void {
    this.state.reset();
    this.lastZoneId = '';
    this.introRunning = false;
    this.chapterShown.clear();
  }

  public dispose(): void {
    this.intro.dispose();
  }
}
