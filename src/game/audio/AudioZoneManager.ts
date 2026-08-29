import { EventBus } from '../core/EventBus';
import { AudioManager, AudioState } from './AudioManager';
import { AudioId } from './AudioRegistry';

interface ZoneAmbienceProfile {
  primaryLoops: AudioId[];
  occasionalSfx?: { id: AudioId; minInterval: number; maxInterval: number }[];
}

const ZONE_AMBIENCE: Record<string, ZoneAmbienceProfile> = {
  ENTRANCE: {
    primaryLoops: [AudioId.AMB_WIND_SOFT, AudioId.AMB_DISTANT_WIND],
    occasionalSfx: [
      { id: AudioId.AMB_WIND_CHIME, minInterval: 12, maxInterval: 25 },
      { id: AudioId.ENV_LEAVES_RUSTLE, minInterval: 8, maxInterval: 18 }
    ]
  },
  COURTYARD: {
    primaryLoops: [AudioId.AMB_WIND_SOFT, AudioId.AMB_DISTANT_WIND],
    occasionalSfx: [
      { id: AudioId.AMB_WIND_CHIME, minInterval: 10, maxInterval: 20 },
      { id: AudioId.AMB_DISTANT_BIRDS, minInterval: 15, maxInterval: 30 },
      { id: AudioId.ENV_LEAVES_RUSTLE, minInterval: 8, maxInterval: 16 }
    ]
  },
  SHRINE: {
    primaryLoops: [AudioId.AMB_WIND_SOFT],
    occasionalSfx: [
      { id: AudioId.SPIRIT_CHIME, minInterval: 8, maxInterval: 18 },
      { id: AudioId.AMB_WIND_CHIME, minInterval: 12, maxInterval: 24 }
    ]
  },
  FOREST: {
    primaryLoops: [AudioId.AMB_FOREST_NIGHT, AudioId.AMB_FOREST_WIND, AudioId.AMB_CRICKETS, AudioId.AMB_NIGHT_INSECTS],
    occasionalSfx: [
      { id: AudioId.ENV_BRANCH_CREAK, minInterval: 10, maxInterval: 22 },
      { id: AudioId.AMB_DISTANT_CREATURE, minInterval: 18, maxInterval: 35 },
      { id: AudioId.ENV_LEAVES_RUSTLE, minInterval: 7, maxInterval: 15 }
    ]
  },
  TEMPLE_APPROACH: {
    primaryLoops: [AudioId.AMB_WIND_MEDIUM, AudioId.AMB_MOUNTAIN_WIND],
    occasionalSfx: [
      { id: AudioId.AMB_WIND_CHIME, minInterval: 12, maxInterval: 25 },
      { id: AudioId.ENV_BRANCH_CREAK, minInterval: 12, maxInterval: 25 }
    ]
  },
  BOSS_ARENA: {
    primaryLoops: [AudioId.AMB_MOUNTAIN_WIND, AudioId.AMB_WIND_STRONG],
    occasionalSfx: []
  }
};

export class AudioZoneManager {
  private state: AudioState = AudioState.EXPLORATION;
  private currentZoneId: string = '';
  private activeLoops: AudioId[] = [];
  private occasionalTimers: { id: AudioId; nextTime: number; minInterval: number; maxInterval: number }[] = [];
  private inCombat: boolean = false;
  private inBoss: boolean = false;

  constructor() {
    this.bindEvents();
  }

  private bindEvents(): void {
    EventBus.on('encounterStarted', () => {
      this.inCombat = true;
      this.state = AudioState.COMBAT;
    });

    EventBus.on('encounterComplete', () => {
      this.inCombat = false;
      if (!this.inBoss) {
        this.state = AudioState.EXPLORATION;
      }
    });

    EventBus.on('bossPhaseTransition', (data: { phase?: number }) => {
      this.inBoss = true;
      const phase = data?.phase ?? 1;
      if (phase === 1) this.state = AudioState.BOSS_PHASE_1;
      else if (phase === 2) this.state = AudioState.BOSS_PHASE_2;
      else if (phase === 3) this.state = AudioState.BOSS_PHASE_3;
    });

    EventBus.on('bossDeath', () => {
      this.inBoss = false;
      this.state = AudioState.VICTORY;
    });

    EventBus.on('gameStateChanged', (data: { current: string }) => {
      if (data.current === 'MAIN_MENU') {
        this.currentZoneId = '';
        this.activeLoops = [];
        this.occasionalTimers = [];
        this.inCombat = false;
        this.inBoss = false;
      }
    });
  }

  public onZoneChanged(zoneId: string): void {
    if (this.currentZoneId === zoneId) return;
    const oldZoneId = this.currentZoneId;
    this.currentZoneId = zoneId;

    this.transitionAmbience(oldZoneId, zoneId);
  }

  private transitionAmbience(_oldZoneId: string, newZoneId: string): void {
    const profile = ZONE_AMBIENCE[newZoneId] || ZONE_AMBIENCE.ENTRANCE;
    const newLoops = profile.primaryLoops;

    // Stop loops that are no longer in the new zone
    for (const loopId of this.activeLoops) {
      if (!newLoops.includes(loopId)) {
        AudioManager.stopLoop(loopId, 2.0);
      }
    }

    // Start new loops
    for (const loopId of newLoops) {
      if (!this.activeLoops.includes(loopId)) {
        AudioManager.startLoop(loopId, 2.0);
      }
    }

    this.activeLoops = [...newLoops];

    // Setup occasional ambient sound timers
    this.occasionalTimers = [];
    if (profile.occasionalSfx) {
      for (const sfx of profile.occasionalSfx) {
        const interval = sfx.minInterval + Math.random() * (sfx.maxInterval - sfx.minInterval);
        this.occasionalTimers.push({
          id: sfx.id,
          nextTime: interval,
          minInterval: sfx.minInterval,
          maxInterval: sfx.maxInterval
        });
      }
    }

    // If exploring, trigger exploration music in background
    if (!this.inCombat && !this.inBoss && this.state === AudioState.EXPLORATION) {
      AudioManager.playMusic(AudioId.MUSIC_EXPLORATION, 3.0);
    }
  }

  public update(dt: number): void {
    // Process occasional ambient one-shots
    for (const timer of this.occasionalTimers) {
      timer.nextTime -= dt;
      if (timer.nextTime <= 0) {
        if (!this.inCombat && !this.inBoss) {
          AudioManager.play(timer.id, {
            volume: 0.15 + Math.random() * 0.1,
            pitchMin: 0.95,
            pitchMax: 1.05
          });
        }
        timer.nextTime = timer.minInterval + Math.random() * (timer.maxInterval - timer.minInterval);
      }
    }
  }

  public getState(): AudioState {
    return this.state;
  }
}
