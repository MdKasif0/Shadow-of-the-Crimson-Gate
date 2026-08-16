import { WAVES_CONFIG, WaveData } from '../config/waveConfig';

export class WaveSystem {
  private currentWaveIndex: number = 0;
  
  constructor() {
    this.currentWaveIndex = 0;
  }

  public startNextWave(): WaveData | null {
    if (this.currentWaveIndex >= WAVES_CONFIG.length) {
      return null;
    }
    const wave = WAVES_CONFIG[this.currentWaveIndex];
    this.currentWaveIndex++;
    return wave;
  }

  public isComplete(): boolean {
    // To be implemented
    return false;
  }
}
