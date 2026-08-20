import { EventBus } from '../core/EventBus';
import { PlayerProgress } from './PlayerProgress';

export class RewardSystem {
  private progress: PlayerProgress;

  private enemyEssenceMap: Record<string, number> = {
    'BASIC_YOKAI': 10,
    'SHADOW_YOKAI': 20,
    'TENGU': 30
  };

  constructor(progress: PlayerProgress) {
    this.progress = progress;
    this.bindEvents();
  }

  private bindEvents(): void {
    EventBus.on('enemyDeath', (data: any) => {
      const type = data.enemyType;
      const essence = this.enemyEssenceMap[type] || 0;
      if (essence > 0) {
        this.progress.addEssence(essence);
      }
    });

    EventBus.on('encounterComplete', (data: any) => {
      if (data.reward && data.reward > 0) {
        this.progress.addEssence(data.reward);
      }
    });
  }
}
