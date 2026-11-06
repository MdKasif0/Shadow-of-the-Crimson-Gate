/**
 * ProceduralScore — An original adaptive battle score, synthesised live.
 *
 * Taiko and shime drums over a low drone, with koto and a breathy flute drawn
 * from the Japanese "In" scale. Each mood sets the tempo and how much of the
 * ensemble is playing, so the music builds as a fight escalates.
 */

export type ScoreMood = 'combat' | 'boss1' | 'boss2' | 'boss3';

interface MoodSettings {
  bpm: number;
  /** Two bars of sixteen steps. 0 is silent, higher is harder. */
  taiko: number[];
  shime: number[];
  droneLevel: number;
  /** Chance per bar of a flute phrase. */
  fluteChance: number;
  /** Chance per eighth note of a koto note. */
  kotoChance: number;
  level: number;
}

const X = 1;   // Full hit
const o = 0.55; // Lighter hit
const _ = 0;

const MOODS: Record<ScoreMood, MoodSettings> = {
  combat: {
    bpm: 96,
    taiko: [X, _, _, _, _, _, o, _, X, _, _, _, o, _, _, _],
    shime: [_, _, o, _, _, _, o, _, _, _, o, _, _, _, o, o],
    droneLevel: 0.11, fluteChance: 0.12, kotoChance: 0.2, level: 0.8,
  },
  boss1: {
    bpm: 104,
    taiko: [X, _, _, o, _, _, X, _, X, _, o, _, X, _, _, _],
    shime: [o, _, o, _, o, _, o, _, o, _, o, _, o, o, o, _],
    droneLevel: 0.16, fluteChance: 0.28, kotoChance: 0.25, level: 0.85,
  },
  boss2: {
    bpm: 122,
    taiko: [X, _, o, _, X, _, o, _, X, _, o, X, _, o, X, _],
    shime: [o, o, _, o, o, o, _, o, o, o, _, o, o, _, o, o],
    droneLevel: 0.2, fluteChance: 0.42, kotoChance: 0.35, level: 0.92,
  },
  boss3: {
    bpm: 142,
    taiko: [X, o, X, _, X, o, X, _, X, o, X, o, X, X, o, X],
    shime: [o, o, o, o, o, o, o, o, o, o, o, o, X, o, X, o],
    droneLevel: 0.26, fluteChance: 0.6, kotoChance: 0.5, level: 1,
  },
};

// D "In" scale: D, Eb, G, A, Bb
const SCALE = [146.83, 155.56, 196.0, 220.0, 233.08];
const DRONE_ROOT = 73.42; // Low D
const LOOKAHEAD_SECONDS = 0.35;
const SCHEDULE_INTERVAL_MS = 60;

export class ProceduralScore {
  private ctx: BaseAudioContext;
  private output: GainNode;
  private noise: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | null = null;
  private mood: ScoreMood = 'combat';
  private nextStepTime = 0;
  private step = 0;
  private bar = 0;
  private droneNodes: AudioScheduledSourceNode[] = [];
  private droneGain: GainNode | null = null;

  constructor(ctx: BaseAudioContext, destination: AudioNode) {
    this.ctx = ctx;

    this.output = ctx.createGain();
    this.output.gain.value = 0;

    // Keeps stacked drum hits from clipping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;
    this.output.connect(compressor);
    compressor.connect(destination);

    const samples = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, samples, samples);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
  }

  public get isPlaying(): boolean {
    return this.timer !== null;
  }

  /** Fades in if stopped. If already playing, the new mood takes over at the next step. */
  public play(mood: ScoreMood, fadeSeconds: number = 1.5): void {
    this.mood = mood;
    const now = this.ctx.currentTime;
    this.fadeTo(MOODS[mood].level, fadeSeconds);
    this.setDroneLevel(MOODS[mood].droneLevel, fadeSeconds);

    if (this.isPlaying) return;

    this.startDrone();
    this.nextStepTime = now + 0.08;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), SCHEDULE_INTERVAL_MS);
  }

  public stop(fadeSeconds: number = 1.5): void {
    if (!this.isPlaying) return;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.fadeTo(0, fadeSeconds);

    const stopAt = this.ctx.currentTime + fadeSeconds + 0.1;
    for (const node of this.droneNodes) node.stop(stopAt);
    this.droneNodes = [];
    this.droneGain = null;
  }

  /** Writes a stretch of the score ahead of time, for offline rendering in tests. */
  public renderOffline(mood: ScoreMood, seconds: number): void {
    this.mood = mood;
    this.output.gain.value = MOODS[mood].level;
    this.startDrone();
    this.setDroneLevel(MOODS[mood].droneLevel, 0);
    for (let t = 0; t < seconds;) {
      this.playStep(t);
      t += this.stepDuration();
    }
  }

  private fadeTo(level: number, seconds: number): void {
    const gain = this.output.gain;
    const now = this.ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(level, now + Math.max(seconds, 0.01));
  }

  private stepDuration(): number {
    return 60 / MOODS[this.mood].bpm / 4;
  }

  private schedule(): void {
    // Time stands still while the game is paused and the context is suspended
    if ((this.ctx as AudioContext).state !== 'running') return;

    const now = this.ctx.currentTime;
    // After the tab was throttled, skip ahead rather than playing a burst of old notes
    if (this.nextStepTime < now) this.nextStepTime = now + 0.02;

    while (this.nextStepTime < now + LOOKAHEAD_SECONDS) {
      this.playStep(this.nextStepTime);
      this.nextStepTime += this.stepDuration();
    }
  }

  private playStep(time: number): void {
    const settings = MOODS[this.mood];
    const step = this.step;

    const taiko = settings.taiko[step];
    if (taiko > 0) this.playTaiko(time, taiko);

    const shime = settings.shime[step];
    if (shime > 0) this.playShime(time, shime);

    if (step % 2 === 0 && Math.random() < settings.kotoChance) this.playKoto(time);

    if (step === 0 && this.bar % 2 === 0 && Math.random() < settings.fluteChance) {
      this.playFlute(time, this.stepDuration() * 14);
    }

    this.step = (step + 1) % 16;
    if (this.step === 0) this.bar++;
  }

  private startDrone(): void {
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;
    this.droneGain.connect(filter);
    filter.connect(this.output);

    // Root and fifth, slightly detuned so they beat slowly against each other
    for (const [frequency, detune] of [[DRONE_ROOT, -5], [DRONE_ROOT, 6], [DRONE_ROOT * 1.5, 2]]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = frequency;
      osc.detune.value = detune;
      osc.connect(this.droneGain);
      osc.start();
      this.droneNodes.push(osc);
    }
  }

  private setDroneLevel(level: number, seconds: number): void {
    if (!this.droneGain) return;
    const gain = this.droneGain.gain;
    const now = this.ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(level, now + Math.max(seconds, 0.01));
  }

  private envelope(time: number, peak: number, attack: number, decay: number): GainNode {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
    return gain;
  }

  private playNoise(time: number, duration: number, destination: AudioNode): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    source.connect(destination);
    source.start(time, Math.random() * 0.8, duration);
  }

  private playTaiko(time: number, velocity: number): void {
    // A deep body that drops in pitch, plus the skin slap on top
    const body = this.ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(118, time);
    body.frequency.exponentialRampToValueAtTime(46, time + 0.22);
    const bodyGain = this.envelope(time, 0.75 * velocity, 0.004, 0.42);
    body.connect(bodyGain);
    bodyGain.connect(this.output);
    body.start(time);
    body.stop(time + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const slapGain = this.envelope(time, 0.3 * velocity, 0.002, 0.07);
    filter.connect(slapGain);
    slapGain.connect(this.output);
    this.playNoise(time, 0.1, filter);
  }

  private playShime(time: number, velocity: number): void {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1900;
    filter.Q.value = 2.4;
    const gain = this.envelope(time, 0.17 * velocity, 0.001, 0.055);
    filter.connect(gain);
    gain.connect(this.output);
    this.playNoise(time, 0.07, filter);
  }

  private playKoto(time: number): void {
    const octave = Math.random() > 0.55 ? 4 : 2;
    const frequency = SCALE[Math.floor(Math.random() * SCALE.length)] * octave;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency * 1.012, time);
    osc.frequency.exponentialRampToValueAtTime(frequency, time + 0.04); // The string's pitch settling
    const gain = this.envelope(time, 0.075, 0.003, 0.65);
    osc.connect(gain);
    gain.connect(this.output);
    osc.start(time);
    osc.stop(time + 0.75);
  }

  private playFlute(time: number, duration: number): void {
    const frequency = SCALE[Math.floor(Math.random() * SCALE.length)] * 2;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency * 0.96, time);
    osc.frequency.linearRampToValueAtTime(frequency, time + 0.28); // The bend into each note

    // Vibrato that deepens as the note is held
    const vibrato = this.ctx.createOscillator();
    vibrato.frequency.value = 5;
    const vibratoDepth = this.ctx.createGain();
    vibratoDepth.gain.setValueAtTime(0, time);
    vibratoDepth.gain.linearRampToValueAtTime(frequency * 0.014, time + duration * 0.7);
    vibrato.connect(vibratoDepth);
    vibratoDepth.connect(osc.frequency);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.085, time + 0.3);
    gain.gain.setValueAtTime(0.085, time + duration * 0.65);
    gain.gain.linearRampToValueAtTime(0, time + duration);
    osc.connect(gain);
    gain.connect(this.output);

    // Breath noise follows the same contour
    const breathFilter = this.ctx.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.value = frequency * 2;
    breathFilter.Q.value = 3;
    const breathGain = this.ctx.createGain();
    breathGain.gain.setValueAtTime(0, time);
    breathGain.gain.linearRampToValueAtTime(0.022, time + 0.2);
    breathGain.gain.linearRampToValueAtTime(0, time + duration);
    breathFilter.connect(breathGain);
    breathGain.connect(this.output);

    const breath = this.ctx.createBufferSource();
    breath.buffer = this.noise;
    breath.loop = true;
    breath.connect(breathFilter);

    for (const source of [osc, vibrato, breath]) {
      source.start(time);
      source.stop(time + duration + 0.05);
    }
  }
}
