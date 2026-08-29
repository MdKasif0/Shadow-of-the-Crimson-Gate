/**
 * AudioBus — Hierarchical gain node routing for volume control.
 * Master → Music, Ambience, SFX, UI buses.
 */

export class AudioBus {
  public readonly node: GainNode;
  private _volume: number;

  constructor(ctx: AudioContext, destination: AudioNode, initialVolume: number = 1.0) {
    this.node = ctx.createGain();
    this._volume = initialVolume;
    this.node.gain.value = initialVolume;
    this.node.connect(destination);
  }

  public get volume(): number { return this._volume; }

  public setVolume(v: number, rampTime: number = 0.05): void {
    this._volume = Math.max(0, Math.min(1, v));
    this.node.gain.linearRampToValueAtTime(this._volume, this.node.context.currentTime + rampTime);
  }

  public fadeToVolume(v: number, duration: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    this.node.gain.linearRampToValueAtTime(this._volume, this.node.context.currentTime + duration);
  }
}

export interface AudioBuses {
  master: AudioBus;
  music: AudioBus;
  ambience: AudioBus;
  sfx: AudioBus;
  ui: AudioBus;
}

export function createAudioBuses(ctx: AudioContext): AudioBuses {
  const master = new AudioBus(ctx, ctx.destination, 0.7);
  const music = new AudioBus(ctx, master.node, 0.5);
  const ambience = new AudioBus(ctx, master.node, 0.6);
  const sfx = new AudioBus(ctx, master.node, 0.8);
  const ui = new AudioBus(ctx, master.node, 0.5);
  return { master, music, ambience, sfx, ui };
}
