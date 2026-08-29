import { EventBus } from '../core/EventBus';

export class AudioManager {
  private static ctx: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static initialized: boolean = false;
  private static isMuted: boolean = false;
  private static ambientOscillator: OscillatorNode | null = null;
  private static ambientGain: GainNode | null = null;

  public static init(): void {
    if (this.initialized) return;

    // Create AudioContext on first interaction
    const initAudio = () => {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;

        this.startAmbient();
      }
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };

    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);

    this.bindEvents();
  }

  private static bindEvents(): void {
    EventBus.on('encounterStarted', () => {
      this.transitionAmbient(40, 0.4); // Tension drone
    });
    
    EventBus.on('encounterComplete', () => {
      this.transitionAmbient(100, 0.1); // Relaxed drone
      this.playEncounterComplete();
    });

    EventBus.on('levelUp', () => this.playLevelUp());
    EventBus.on('shrineActivated', () => this.playShrine());
    EventBus.on('enemyDeath', () => this.playEnemyDeath());
  }

  // ─── Boss Audio Hooks ──────────────────────────────────────────────────

  public static playBossIntro(): void {
    // Stub: Play dramatic taiko drum hit / riser
    console.log('[Audio] Playing Boss Intro Music/Stinger');
  }

  public static playBossPhase(phase: number): void {
    // Stub: Crossfade to phase-specific combat track
    console.log(`[Audio] Playing Boss Phase ${phase} Music`);
  }

  public static playBossDefeat(): void {
    // Stub: Stop combat music, play victory/collapse stinger
    console.log('[Audio] Playing Boss Defeat Audio');
  }

  // --- Core Synthesis ---
  
  private static createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private static playSound(setup: (ctx: AudioContext, dest: AudioNode, time: number) => void) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    setup(this.ctx, this.masterGain, this.ctx.currentTime);
  }

  // --- Specific Sounds ---

  public static playPlayerAttack(comboIndex: number): void {
    const freqs = [800, 1000, 1200];
    const freq = freqs[comboIndex % freqs.length] || 800;
    this.playSwordSwing(freq);
  }

  public static playSwordSwing(baseFreq: number = 800): void {
    this.playSound((ctx, dest, time) => {
      const bufferSource = ctx.createBufferSource();
      bufferSource.buffer = this.createNoiseBuffer();
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq, time);
      filter.Q.value = 1.5;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.8, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

      bufferSource.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      bufferSource.start(time);
      bufferSource.stop(time + 0.2);
    });
  }

  public static playSwordHit(): void {
    this.playSound((ctx, dest, time) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.1);
    });
  }

  public static playEnemyAttack(): void {
    this.playSwordSwing(600); // lower pitch for enemy
  }

  public static playEnemyHurt(): void {
    this.playSound((ctx, dest, time) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, time);
      osc.frequency.linearRampToValueAtTime(100, time + 0.1);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.1);
    });
  }

  public static playEnemyDeath(): void {
    this.playSound((ctx, dest, time) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + 0.5);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, time);
      filter.frequency.linearRampToValueAtTime(100, time + 0.5);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.5);
    });
  }

  public static playPlayerHurt(): void {
    this.playSound((ctx, dest, time) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.3);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.3);
    });
  }

  public static playDash(): void {
    this.playSound((ctx, dest, time) => {
      const bufferSource = ctx.createBufferSource();
      bufferSource.buffer = this.createNoiseBuffer();
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, time);
      filter.frequency.linearRampToValueAtTime(800, time + 0.2);
      filter.Q.value = 0.5;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.5, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

      bufferSource.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      bufferSource.start(time);
      bufferSource.stop(time + 0.2);
    });
  }

  public static playShrine(): void {
    this.playSound((ctx, dest, time) => {
      const freqs = [440, 554.37, 659.25, 880]; // A major arpeggio
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const gain = ctx.createGain();
        const t = time + i * 0.15;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 1.5);
      });
    });
  }

  public static playLevelUp(): void {
    this.playSound((ctx, dest, time) => {
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C major
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const gain = ctx.createGain();
        const t = time + i * 0.1;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.6);
      });
    });
  }

  public static playEncounterComplete(): void {
    this.playSound((ctx, dest, time) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, time); // A4
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.4, time + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 3.0);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 3.0);
    });
  }

  // --- Ambient Drone ---

  private static startAmbient(): void {
    if (!this.ctx || !this.masterGain) return;
    this.ambientOscillator = this.ctx.createOscillator();
    this.ambientOscillator.type = 'sine';
    this.ambientOscillator.frequency.value = 100; // Low rumble

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.1;

    this.ambientOscillator.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    this.ambientOscillator.start();
  }

  private static transitionAmbient(targetFreq: number, targetVolume: number): void {
    if (!this.ctx || !this.ambientOscillator || !this.ambientGain) return;
    const time = this.ctx.currentTime;
    this.ambientOscillator.frequency.linearRampToValueAtTime(targetFreq, time + 2.0);
    this.ambientGain.gain.linearRampToValueAtTime(targetVolume, time + 2.0);
  }

  public static toggleMute(): void {
    this.isMuted = !this.isMuted;
  }
}
