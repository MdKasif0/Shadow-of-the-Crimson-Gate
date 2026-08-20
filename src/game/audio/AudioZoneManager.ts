import { EventBus } from '../core/EventBus';
import { AudioManager } from './AudioManager';

export enum AudioState {
  EXPLORATION,
  COMBAT
}

export class AudioZoneManager {
  private state: AudioState = AudioState.EXPLORATION;

  constructor() {
    this.bindEvents();
  }

  private bindEvents(): void {
    EventBus.on('encounterStarted', () => {
      this.setState(AudioState.COMBAT);
    });

    EventBus.on('encounterComplete', () => {
      this.setState(AudioState.EXPLORATION);
    });
  }

  private setState(newState: AudioState): void {
    if (this.state === newState) return;
    this.state = newState;
    
    // AudioManager automatically listens to the same events for music transitions,
    // but this manager could handle logic for specific zones (Forest vs Shrine) if needed later.
  }
}
