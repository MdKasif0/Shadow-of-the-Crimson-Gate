/**
 * AudioManager — Production audio system.
 * 
 * Single authoritative manager for all game audio.
 * Uses Web Audio API with file-based playback, bus routing,
 * cooldowns, concurrency limits, pitch/volume variation, and caching.
 */

import { EventBus } from '../core/EventBus';
import { AudioId, AudioCategory, AudioPriority, AUDIO_REGISTRY } from './AudioRegistry';
import { AudioBus, AudioBuses, createAudioBuses } from './AudioBus';
import { ProceduralScore, ScoreMood } from './ProceduralScore';
import * as THREE from 'three';

/** What the music should currently be doing. */
export type MusicMood = 'explore' | 'combat' | 'boss1' | 'boss2' | 'boss3' | 'victory';

/** How much reverb each zone has, from the two synthesised rooms. */
const ZONE_REVERB: Record<string, { hall: number; open: number }> = {
  ENTRANCE: { hall: 0, open: 0.1 },
  COURTYARD: { hall: 0, open: 0.12 },
  SHRINE: { hall: 0.04, open: 0.12 },
  FOREST: { hall: 0, open: 0.18 },
  TEMPLE_APPROACH: { hall: 0.34, open: 0.05 },
  BOSS_ARENA: { hall: 0.16, open: 0.3 },
};

// ─── Constants ─────────────────────────────────────────────────────────────

const MAX_CONCURRENT_SFX = 24;
const MUSIC_CROSSFADE_DURATION = 2.0;

// ─── Types ─────────────────────────────────────────────────────────────────

interface ActiveSource {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  id: AudioId;
  priority: AudioPriority;
  startTime: number;
}

export interface PlayOptions {
  volume?: number;       // Override volume (0–1)
  pitchMin?: number;     // Min playback rate (e.g. 0.96)
  pitchMax?: number;     // Max playback rate (e.g. 1.04)
  cooldownMs?: number;   // Minimum ms between plays of same ID
  loop?: boolean;        // Override loop setting
  sliceSeconds?: number; // Play only a random slice this long (for long source recordings)
  position?: THREE.Vector3; // Play from this point in the world, panned and attenuated
}

// ─── Audio State ───────────────────────────────────────────────────────────

export enum AudioState {
  MENU,
  EXPLORATION,
  COMBAT,
  BOSS_PHASE_1,
  BOSS_PHASE_2,
  BOSS_PHASE_3,
  VICTORY,
  ENDING,
  GAME_OVER,
  PAUSED,
}

// ─── AudioManager ──────────────────────────────────────────────────────────

export class AudioManager {
  private static ctx: AudioContext | null = null;
  private static buses: AudioBuses | null = null;
  private static initialized: boolean = false;
  private static suspended: boolean = true;

  // Cache: AudioId → decoded AudioBuffer
  private static bufferCache: Map<string, AudioBuffer> = new Map();
  // Track which files have already been warned as missing
  private static warnedMissing: Set<string> = new Set();
  // Loading promises to avoid double-fetching
  private static loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();

  // Active SFX sources for concurrency limits
  private static activeSources: ActiveSource[] = [];
  // Cooldown timestamps: AudioId → last play time
  private static cooldowns: Map<string, number> = new Map();

  // Current music source
  private static currentMusic: ActiveSource | null = null;
  private static currentMusicId: AudioId | null = null;

  // Active ambient loops: AudioId → ActiveSource
  private static activeLoops: Map<string, ActiveSource> = new Map();

  // Audio state
  private static audioState: AudioState = AudioState.MENU;

  private static score: ProceduralScore | null = null;
  private static currentMood: MusicMood | null = null;
  private static hallSend: GainNode | null = null;
  private static openSend: GainNode | null = null;
  private static listenerForward = new THREE.Vector3();

  // ─── Init ──────────────────────────────────────────────────────────────

  public static init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Create AudioContext on first user interaction (browser policy)
    const resume = () => {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.buses = createAudioBuses(this.ctx);
        this.suspended = false;
        this.score = new ProceduralScore(this.ctx, this.buses.music.node);
        this.setupReverb();

        // Preload critical assets
        this.preloadEssentials();
      } else if (this.ctx.state === 'suspended') {
        this.ctx.resume();
        this.suspended = false;
      }
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
    };

    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);

    this.bindEvents();
  }

  // ─── Space ─────────────────────────────────────────────────────────────

  /** A synthetic room: decaying noise, darker towards the end like absorbent walls. */
  private static createImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      let smoothed = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const damping = 0.08 + (1 - t) * 0.6;
        smoothed += (Math.random() * 2 - 1 - smoothed) * damping;
        data[i] = smoothed * Math.pow(1 - t, decay);
      }
    }
    return impulse;
  }

  private static setupReverb(): void {
    const ctx = this.ctx!;
    const buses = this.buses!;

    const addRoom = (seconds: number, decay: number): GainNode => {
      const send = ctx.createGain();
      send.gain.value = 0;
      const convolver = ctx.createConvolver();
      convolver.buffer = this.createImpulse(seconds, decay);
      buses.sfx.node.connect(send);
      send.connect(convolver);
      convolver.connect(buses.master.node);
      return send;
    };

    this.hallSend = addRoom(1.7, 2.6);  // Close wooden walls
    this.openSend = addRoom(3.0, 3.4);  // Distant echoes across open ground
  }

  /** Fades to the sound of the room the player has just walked into. */
  public static setZoneReverb(zoneId: string): void {
    if (!this.ctx || !this.hallSend || !this.openSend) return;
    const reverb = ZONE_REVERB[zoneId] ?? ZONE_REVERB.ENTRANCE;
    const now = this.ctx.currentTime;
    this.hallSend.gain.setTargetAtTime(reverb.hall, now, 0.5);
    this.openSend.gain.setTargetAtTime(reverb.open, now, 0.5);
  }

  /** Keeps 3D sounds positioned relative to the camera. */
  public static updateListener(camera: THREE.Camera): void {
    if (!this.ctx) return;
    const listener = this.ctx.listener;
    const forward = camera.getWorldDirection(this.listenerForward);
    const { x, y, z } = camera.position;

    if (listener.positionX) {
      const now = this.ctx.currentTime;
      listener.positionX.setValueAtTime(x, now);
      listener.positionY.setValueAtTime(y, now);
      listener.positionZ.setValueAtTime(z, now);
      listener.forwardX.setValueAtTime(forward.x, now);
      listener.forwardY.setValueAtTime(forward.y, now);
      listener.forwardZ.setValueAtTime(forward.z, now);
      listener.upX.setValueAtTime(0, now);
      listener.upY.setValueAtTime(1, now);
      listener.upZ.setValueAtTime(0, now);
    } else {
      listener.setPosition(x, y, z); // Firefox
      listener.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
    }
  }

  // ─── Bus Accessors ─────────────────────────────────────────────────────

  private static getBus(category: AudioCategory): AudioBus | null {
    if (!this.buses) return null;
    switch (category) {
      case AudioCategory.MUSIC: return this.buses.music;
      case AudioCategory.AMBIENCE: return this.buses.ambience;
      case AudioCategory.UI: return this.buses.ui;
      default: return this.buses.sfx;
    }
  }

  // ─── Volume Controls (for SettingsManager) ─────────────────────────────

  public static setMasterVolume(v: number): void {
    this.buses?.master.setVolume(v);
  }

  public static setMusicVolume(v: number): void {
    this.buses?.music.setVolume(v);
  }

  public static setSfxVolume(v: number): void {
    this.buses?.sfx.setVolume(v);
  }

  public static setAmbienceVolume(v: number): void {
    this.buses?.ambience.setVolume(v);
  }

  // ─── Loading ───────────────────────────────────────────────────────────

  private static async loadBuffer(id: AudioId): Promise<AudioBuffer | null> {
    const entry = AUDIO_REGISTRY[id];
    if (!entry) return null;

    // Check cache
    if (this.bufferCache.has(id)) {
      return this.bufferCache.get(id)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id)!;
    }

    const promise = this.fetchAndDecode(id, entry.path, entry.optional);
    this.loadingPromises.set(id, promise);
    const buffer = await promise;
    this.loadingPromises.delete(id);
    return buffer;
  }

  private static async fetchAndDecode(id: AudioId, path: string, optional: boolean): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      const response = await fetch(path);
      if (!response.ok) {
        if (!optional && !this.warnedMissing.has(id)) {
          console.warn(`[Audio] Missing asset: ${path}`);
          this.warnedMissing.add(id);
        }
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.bufferCache.set(id, audioBuffer);
      return audioBuffer;
    } catch {
      if (!optional && !this.warnedMissing.has(id)) {
        console.warn(`[Audio] Failed to load: ${path}`);
        this.warnedMissing.add(id);
      }
      return null;
    }
  }

  private static preloadEssentials(): void {
    // Preload frequently needed sounds immediately
    const essentials = [
      AudioId.SWORD_SWING_01, AudioId.SWORD_SWING_02, AudioId.SWORD_SWING_03,
      AudioId.SWORD_HIT_01, AudioId.SWORD_HIT_02,
      AudioId.PLAYER_DASH,
      AudioId.UI_HOVER, AudioId.UI_SELECT, AudioId.UI_CONFIRM,
      AudioId.FOOTSTEP_STONE_02,
      AudioId.FOOTSTEP_GRASS_01, AudioId.FOOTSTEP_GRASS_02,
    ];
    for (const id of essentials) {
      this.loadBuffer(id);
    }
  }

  // ─── Core Play ─────────────────────────────────────────────────────────

  public static async play(id: AudioId, opts?: PlayOptions): Promise<void> {
    if (!this.ctx || !this.buses || this.suspended) return;

    const entry = AUDIO_REGISTRY[id];
    if (!entry) return;

    // Cooldown check
    const cooldownMs = opts?.cooldownMs ?? 0;
    if (cooldownMs > 0) {
      const lastPlay = this.cooldowns.get(id) ?? 0;
      if (Date.now() - lastPlay < cooldownMs) return;
    }
    this.cooldowns.set(id, Date.now());

    // Concurrency limit for SFX
    if (entry.category !== AudioCategory.MUSIC && entry.category !== AudioCategory.AMBIENCE) {
      this.cleanupFinished();
      if (this.activeSources.length >= MAX_CONCURRENT_SFX) {
        // Evict lowest priority
        this.evictLowest();
      }
    }

    const buffer = await this.loadBuffer(id);
    if (!buffer || !this.ctx) return;

    const bus = this.getBus(entry.category);
    if (!bus) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = opts?.loop ?? entry.loop;

    // Pitch variation
    if (opts?.pitchMin !== undefined && opts?.pitchMax !== undefined) {
      source.playbackRate.value = opts.pitchMin + Math.random() * (opts.pitchMax - opts.pitchMin);
    }

    // Per-source gain for volume control
    const gainNode = this.ctx.createGain();
    const vol = (opts?.volume ?? entry.volume);
    gainNode.gain.value = vol;

    source.connect(gainNode);

    if (opts?.position) {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = 7;
      panner.rolloffFactor = 1.1;
      panner.positionX.value = opts.position.x;
      panner.positionY.value = opts.position.y + 1.2;
      panner.positionZ.value = opts.position.z;
      gainNode.connect(panner);
      panner.connect(bus.node);
    } else {
      gainNode.connect(bus.node);
    }

    const active: ActiveSource = {
      source, gainNode, id, priority: entry.priority, startTime: this.ctx.currentTime
    };

    if (opts?.sliceSeconds) {
      const slice = Math.min(opts.sliceSeconds, buffer.duration);
      const offset = Math.random() * (buffer.duration - slice);
      const now = this.ctx.currentTime;
      const fade = Math.min(0.05, slice / 2); // Avoids clicks at the cut points
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(vol, now + fade);
      gainNode.gain.setValueAtTime(vol, now + slice - fade);
      gainNode.gain.linearRampToValueAtTime(0, now + slice);
      source.start(0, offset, slice);
    } else {
      source.start();
    }

    if (!source.loop) {
      source.onended = () => {
        const idx = this.activeSources.indexOf(active);
        if (idx !== -1) this.activeSources.splice(idx, 1);
      };
    }

    this.activeSources.push(active);
  }

  // ─── Play Random ───────────────────────────────────────────────────────

  public static playRandom(ids: AudioId[], opts?: PlayOptions): void {
    if (ids.length === 0) return;
    const id = ids[Math.floor(Math.random() * ids.length)];
    this.play(id, opts);
  }

  // ─── Music ─────────────────────────────────────────────────────────────

  public static async playMusic(id: AudioId, fadeDuration: number = MUSIC_CROSSFADE_DURATION): Promise<void> {
    if (this.currentMusicId === id) return; // Don't restart same track

    // Fade out current music
    if (this.currentMusic && this.ctx) {
      const old = this.currentMusic;
      old.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeDuration);
      setTimeout(() => {
        try { old.source.stop(); } catch { /* already stopped */ }
      }, fadeDuration * 1000 + 100);
      this.currentMusic = null;
      this.currentMusicId = null;
    }

    if (!this.ctx || !this.buses) return;

    const entry = AUDIO_REGISTRY[id];
    if (!entry) return;

    const buffer = await this.loadBuffer(id);
    if (!buffer || !this.ctx) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = entry.loop;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0;
    gainNode.gain.linearRampToValueAtTime(entry.volume, this.ctx.currentTime + fadeDuration);

    source.connect(gainNode);
    gainNode.connect(this.buses.music.node);
    source.start();

    this.currentMusic = { source, gainNode, id, priority: entry.priority, startTime: this.ctx.currentTime };
    this.currentMusicId = id;
  }

  /** Moves the music to a mood, crossfading between recorded tracks and the live score. */
  public static setMusicMood(mood: MusicMood): void {
    if (mood === this.currentMood || !this.ctx || !this.score) return;
    this.currentMood = mood;

    if (mood === 'explore' || mood === 'victory') {
      this.score.stop(2.2);
      this.playMusic(mood === 'explore' ? AudioId.MUSIC_EXPLORATION : AudioId.MUSIC_VICTORY, 2.5);
    } else {
      this.stopMusic(1.2);
      this.score.play(mood as ScoreMood, 1.2);
    }
  }

  /** Silences all music until the next mood is set. */
  public static silenceMusic(fadeDuration: number = 1): void {
    this.currentMood = null;
    this.score?.stop(fadeDuration);
    this.stopMusic(fadeDuration);
  }

  public static stopMusic(fadeDuration: number = MUSIC_CROSSFADE_DURATION): void {
    if (!this.currentMusic || !this.ctx) return;
    const old = this.currentMusic;
    old.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeDuration);
    setTimeout(() => {
      try { old.source.stop(); } catch { /* already stopped */ }
    }, fadeDuration * 1000 + 100);
    this.currentMusic = null;
    this.currentMusicId = null;
  }

  // ─── Ambient Loops ─────────────────────────────────────────────────────

  public static async startLoop(id: AudioId, fadeDuration: number = 1.5): Promise<void> {
    if (this.activeLoops.has(id)) return;
    if (!this.ctx || !this.buses) return;

    const entry = AUDIO_REGISTRY[id];
    if (!entry) return;

    const buffer = await this.loadBuffer(id);
    if (!buffer || !this.ctx) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0;
    gainNode.gain.linearRampToValueAtTime(entry.volume, this.ctx.currentTime + fadeDuration);

    source.connect(gainNode);
    gainNode.connect(this.buses.ambience.node);
    source.start();

    this.activeLoops.set(id, { source, gainNode, id, priority: entry.priority, startTime: this.ctx.currentTime });
  }

  public static stopLoop(id: AudioId, fadeDuration: number = 1.5): void {
    const loop = this.activeLoops.get(id);
    if (!loop || !this.ctx) return;

    loop.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeDuration);
    setTimeout(() => {
      try { loop.source.stop(); } catch { /* already stopped */ }
    }, fadeDuration * 1000 + 100);
    this.activeLoops.delete(id);
  }

  public static stopAllLoops(fadeDuration: number = 1.5): void {
    for (const [id] of this.activeLoops) {
      this.stopLoop(id as AudioId, fadeDuration);
    }
  }

  // ─── Concurrency Management ────────────────────────────────────────────

  private static cleanupFinished(): void {
    // AudioBufferSourceNodes auto-remove via onended, but clean up stale references
    this.activeSources = this.activeSources.filter(s => {
      try {
        return s.source.buffer !== null; // still valid
      } catch { return false; }
    });
  }

  private static evictLowest(): void {
    if (this.activeSources.length === 0) return;
    let lowestIdx = 0;
    let lowestPri = this.activeSources[0].priority;
    for (let i = 1; i < this.activeSources.length; i++) {
      if (this.activeSources[i].priority < lowestPri) {
        lowestPri = this.activeSources[i].priority;
        lowestIdx = i;
      }
    }
    try { this.activeSources[lowestIdx].source.stop(); } catch { /* ok */ }
    this.activeSources.splice(lowestIdx, 1);
  }

  // ─── Pause / Resume ────────────────────────────────────────────────────

  public static pause(): void {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
      this.suspended = true;
    }
  }

  public static resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
      this.suspended = false;
    }
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  public static stopAll(): void {
    // Stop all SFX
    for (const s of this.activeSources) {
      try { s.source.stop(); } catch { /* ok */ }
    }
    this.activeSources = [];

    // Stop music
    this.currentMood = null;
    this.score?.stop(0.2);
    if (this.currentMusic) {
      try { this.currentMusic.source.stop(); } catch { /* ok */ }
      this.currentMusic = null;
      this.currentMusicId = null;
    }

    // Stop loops
    for (const [, loop] of this.activeLoops) {
      try { loop.source.stop(); } catch { /* ok */ }
    }
    this.activeLoops.clear();
  }

  // ─── Backward-Compatible API ───────────────────────────────────────────
  // These preserve the exact method signatures used by existing callsites.

  public static playPlayerAttack(comboIndex: number): void {
    const swings = [AudioId.SWORD_SWING_01, AudioId.SWORD_SWING_02, AudioId.SWORD_SWING_03];
    const id = swings[comboIndex % swings.length];
    this.play(id, { pitchMin: 0.95, pitchMax: 1.05, cooldownMs: 100 });
  }

  public static playSwordSwing(_baseFreq?: number): void {
    this.playRandom(
      [AudioId.SWORD_SWING_01, AudioId.SWORD_SWING_02, AudioId.SWORD_SWING_03],
      { pitchMin: 0.96, pitchMax: 1.04, cooldownMs: 80 }
    );
  }

  public static playSwordHit(): void {
    this.playRandom(
      [AudioId.SWORD_HIT_01, AudioId.SWORD_HIT_02],
      { pitchMin: 0.95, pitchMax: 1.05, cooldownMs: 60 }
    );
  }

  public static playEnemyAttack(): void {
    this.play(AudioId.YOKAI_ATTACK, { pitchMin: 0.9, pitchMax: 1.1, cooldownMs: 200 });
  }

  public static playEnemyHurt(): void {
    this.play(AudioId.YOKAI_HURT, { pitchMin: 0.95, pitchMax: 1.05, cooldownMs: 150 });
  }

  public static playEnemyDeath(): void {
    this.play(AudioId.YOKAI_DEATH, { cooldownMs: 300 });
  }

  public static playPlayerHurt(): void {
    this.play(AudioId.YOKAI_HURT, { volume: 0.5, pitchMin: 0.8, pitchMax: 0.9, cooldownMs: 200 });
  }

  public static playDash(): void {
    this.play(AudioId.PLAYER_DASH, { cooldownMs: 300 });
  }

  public static playShrine(): void {
    this.play(AudioId.SHRINE_ACTIVATE);
  }

  public static playLevelUp(): void {
    this.play(AudioId.SYS_LEVEL_UP);
  }

  public static playEncounterComplete(): void {
    this.play(AudioId.UI_NOTIFICATION);
  }

  // ── Boss ──

  public static playBossIntro(): void {
    this.play(AudioId.BOSS_ROAR_01);
  }

  public static playBossPhase(phase: number): void {
    if (phase === 2) this.play(AudioId.BOSS_PHASE_2);
    if (phase === 3) this.play(AudioId.BOSS_PHASE_3);
  }

  public static playBossDefeat(): void {
    this.play(AudioId.BOSS_DEATH);
  }

  // ── Tengu-specific ──
  public static playTenguAttack(): void {
    this.play(AudioId.TENGU_ATTACK, { cooldownMs: 200 });
  }

  // ── Shadow-specific ──
  public static playShadowAttack(): void {
    this.play(AudioId.SHADOW_ATTACK, { cooldownMs: 200 });
  }

  // ── Boss-specific ──
  public static playBossAttack(position?: THREE.Vector3): void {
    this.play(AudioId.BOSS_ATTACK, { pitchMin: 0.9, pitchMax: 1.0, cooldownMs: 200, position });
  }

  // ─── Footsteps ─────────────────────────────────────────────────────────

  public static playFootstep(surface: 'stone' | 'grass' = 'stone'): void {
    // The footstep files are long walking recordings, so each step plays a short slice
    const opts = { pitchMin: 0.96, pitchMax: 1.04, cooldownMs: 250, sliceSeconds: 0.4 };
    if (surface === 'grass') {
      this.playRandom([AudioId.FOOTSTEP_GRASS_01, AudioId.FOOTSTEP_GRASS_02], opts);
    } else {
      this.play(AudioId.FOOTSTEP_STONE_02, opts);
    }
  }

  // ─── UI Sounds ─────────────────────────────────────────────────────────

  public static playUIHover(): void {
    this.play(AudioId.UI_HOVER, { cooldownMs: 80 });
  }

  public static playUISelect(): void {
    this.play(AudioId.UI_SELECT, { cooldownMs: 100 });
  }

  public static playUIConfirm(): void {
    this.play(AudioId.UI_CONFIRM, { cooldownMs: 200 });
  }

  public static playUIBack(): void {
    this.play(AudioId.UI_BACK, { cooldownMs: 200 });
  }

  // ─── Event Bindings ────────────────────────────────────────────────────

  private static bindEvents(): void {
    EventBus.on('encounterComplete', () => {
      this.playEncounterComplete();
    });

    EventBus.on('levelUp', () => this.playLevelUp());
    EventBus.on('shrineActivated', () => this.playShrine());
    EventBus.on('enemyDeath', () => this.playEnemyDeath());

    EventBus.on('playerDeath', () => {
      this.silenceMusic(1.0);
      setTimeout(() => this.play(AudioId.SYS_GAME_OVER), 1500);
    });

    EventBus.on('settingsChanged', (settings: any) => {
      if (settings.masterVolume !== undefined) this.setMasterVolume(settings.masterVolume);
      if (settings.musicVolume !== undefined) this.setMusicVolume(settings.musicVolume);
      if (settings.sfxVolume !== undefined) this.setSfxVolume(settings.sfxVolume);
    });

    EventBus.on('gameStateChanged', (data: { current: string, previous: string | null }) => {
      if (data.current === 'PAUSED') {
        this.pause();
      } else if (data.previous === 'PAUSED') {
        this.resume();
      }
      if (data.current === 'MAIN_MENU') {
        this.stopAll(); // The menu plays its own theme
      }
    });
  }

  // ─── Mute (legacy) ────────────────────────────────────────────────────

  public static toggleMute(): void {
    if (this.buses) {
      const current = this.buses.master.volume;
      this.buses.master.setVolume(current > 0 ? 0 : 0.7);
    }
  }
}
