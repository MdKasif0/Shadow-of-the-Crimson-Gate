// ─── Story Intro ────────────────────────────────────────────────────────────
// Short cinematic text sequence on new game start. Any key or click skips it.

import { EventBus } from '../core/EventBus';
import { StoryEvents } from './StoryEvent';

/** Ignore input this soon after starting, so the click on New Game doesn't skip it. */
const SKIP_DELAY_MS = 500;

export class StoryIntro {
  private overlay: HTMLDivElement;
  private textEl: HTMLDivElement;
  private hintEl: HTMLDivElement;
  private isPlaying: boolean = false;
  private isSkipped: boolean = false;
  private wakeWaiter: (() => void) | null = null;

  private cards: string[] = [
    'The mountain has been silent for three days...',
    'Villagers speak of shadows moving beyond the tree line.',
    'A lone ronin approaches the ancient gate.',
    'Something stirs beyond the Crimson Gate...',
  ];

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'story-intro-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      zIndex: '600', background: '#000', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      opacity: '0', transition: 'opacity 1s ease',
      pointerEvents: 'none',
    });

    this.textEl = document.createElement('div');
    Object.assign(this.textEl.style, {
      color: '#c0b8a0', fontFamily: "'Cinzel', serif",
      fontSize: '22px', letterSpacing: '2px', lineHeight: '2',
      textAlign: 'center', maxWidth: '680px', padding: '40px',
      opacity: '0', transition: 'opacity 1.5s ease',
    });

    this.hintEl = document.createElement('div');
    this.hintEl.textContent = 'Press any key to skip';
    Object.assign(this.hintEl.style, {
      position: 'absolute', bottom: '36px', right: '40px',
      color: 'rgba(192, 184, 160, 0.55)', fontFamily: "'Inter', sans-serif",
      fontSize: '12px', letterSpacing: '0.12em',
    });

    this.overlay.appendChild(this.textEl);
    this.overlay.appendChild(this.hintEl);
    document.body.appendChild(this.overlay);

    this.handleSkip = this.handleSkip.bind(this);
  }

  public async play(): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.isSkipped = false;

    const skipReadyTimer = setTimeout(() => {
      window.addEventListener('keydown', this.handleSkip);
      window.addEventListener('mousedown', this.handleSkip);
    }, SKIP_DELAY_MS);

    this.overlay.style.pointerEvents = 'auto';
    this.overlay.style.opacity = '1';
    await this.wait(1000);

    for (const card of this.cards) {
      if (this.isSkipped) break;
      this.textEl.textContent = card;
      this.textEl.style.opacity = '1';
      await this.wait(3000);
      this.textEl.style.opacity = '0';
      await this.wait(1500);
    }

    clearTimeout(skipReadyTimer);
    window.removeEventListener('keydown', this.handleSkip);
    window.removeEventListener('mousedown', this.handleSkip);

    this.textEl.style.opacity = '0';
    this.overlay.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, this.isSkipped ? 500 : 1200));
    this.overlay.style.pointerEvents = 'none';

    this.isPlaying = false;
    EventBus.emit(StoryEvents.INTRO_COMPLETE, {});
  }

  private handleSkip(e: Event): void {
    // Escape belongs to the pause menu
    if (e instanceof KeyboardEvent && e.code === 'Escape') return;
    this.isSkipped = true;
    this.wakeWaiter?.();
  }

  /** A wait that ends early if the player skips. */
  private wait(ms: number): Promise<void> {
    if (this.isSkipped) return Promise.resolve();
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this.wakeWaiter = null;
        resolve();
      }, ms);
      this.wakeWaiter = () => {
        clearTimeout(timer);
        this.wakeWaiter = null;
        resolve();
      };
    });
  }

  public dispose(): void {
    this.overlay.remove();
  }
}
