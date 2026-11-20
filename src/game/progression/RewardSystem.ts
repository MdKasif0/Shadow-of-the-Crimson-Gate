import { EventBus } from '../core/EventBus';
import { PlayerProgress } from './PlayerProgress';
import { LEVEL_ENEMIES } from '../enemies/LevelEnemyDefs';

const ESSENCE_BY_TYPE: Record<string, number> = {
  BASIC_YOKAI: 10,
  SHADOW_YOKAI: 20,
  TENGU: 30,
};

const ESSENCE_BY_VARIANT: Record<string, number> = {
  MINION: 2,
  SHIELDED: 18,
  SUMMONER: 28,
  AMBUSHER: 26,
};

/** Spirit Essence for each kill and each cleared fight. */
export class RewardSystem {
  constructor(private progress: PlayerProgress) {
    EventBus.on('enemyDeath', (data: { enemyType: string; variant?: string; isElite?: boolean }) => {
      const base = (data.variant ? ESSENCE_BY_VARIANT[data.variant] : undefined)
        ?? ESSENCE_BY_TYPE[data.enemyType] ?? LEVEL_ENEMIES[data.enemyType]?.essence ?? 0;
      this.progress.addEssence(data.isElite ? base * 6 : base);
    });

    EventBus.on('encounterComplete', (data: { reward?: number }) => {
      if (data.reward && data.reward > 0) this.progress.addEssence(data.reward);
    });
  }
}
