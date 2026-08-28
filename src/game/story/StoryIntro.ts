// ─── Story Intro ────────────────────────────────────────────────────────────
// Short cinematic text sequence on new game start.

import { EventBus } from '../core/EventBus';
import { StoryEvents } from './StoryEvent';

export class StoryIntro {
  private overlay: HTMLDivElement;
  private textEl: HTMLDivElement;
  private isPlaying: boolean = false;

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
      color: '#c0b8a0', fontFamily: "'Noto Serif JP', serif, monospace",
      fontSize: '22px', letterSpacing: '2px', lineHeight: '2',
      textAlign: 'center', maxWidth: '600px', padding: '40px',
      opacity: '0', transition: 'opacity 1.5s ease',
    });

    this.overlay.appendChild(this.textEl);
    document.body.appendChild(this.overlay);
  }

  public async play(): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Fade in overlay
    this.overlay.style.pointerEvents = 'auto';
    this.overlay.style.opacity = '1';
    await this.wait(1000);

    // Show each text card
    for (const card of this.cards) {
      this.textEl.textContent = card;
      this.textEl.style.opacity = '1';
      await this.wait(3000);
      this.textEl.style.opacity = '0';
      await this.wait(1500);
    }

    // Fade out overlay
    this.overlay.style.opacity = '0';
    await this.wait(1200);
    this.overlay.style.pointerEvents = 'none';

    this.isPlaying = false;
    EventBus.emit(StoryEvents.INTRO_COMPLETE, {});
  }

  /** Allow skip with any key or click */
  public enableSkip(resolve: () => void): () => void {
    const handler = () => {
      resolve();
      window.removeEventListener('keydown', handler);
      window.removeEventListener('click', handler);
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('click', handler);
    return handler;
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public dispose(): void {
    this.overlay.remove();
  }
}
