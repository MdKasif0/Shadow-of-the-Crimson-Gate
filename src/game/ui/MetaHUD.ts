import { EventBus } from '../core/EventBus';
import { AudioManager } from '../audio/AudioManager';
import { AudioId } from '../audio/AudioRegistry';
import { formatTime } from './WorldMap';

/** A banner that slides in when an achievement is earned, in menus or in play. */
export class AchievementToast {
  private stack: HTMLDivElement;

  constructor() {
    this.stack = document.createElement('div');
    this.stack.className = 'achievement-toasts';
    this.stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.stack);
    EventBus.on('achievementUnlocked', (data: { title: string; text: string }) => this.show(data.title, data.text));
  }

  private show(title: string, text: string): void {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <span class="achievement-toast__seal" aria-hidden="true">✦</span>
      <span class="achievement-toast__body">
        <span class="achievement-toast__label">Achievement</span>
        <strong></strong>
        <span class="achievement-toast__text"></span>
      </span>`;
    toast.querySelector('strong')!.textContent = title;
    toast.querySelector('.achievement-toast__text')!.textContent = text;
    this.stack.appendChild(toast);
    AudioManager.play(AudioId.SPIRIT_CHIME, { volume: 0.8 });
    setTimeout(() => toast.classList.add('achievement-toast--leaving'), 4800);
    setTimeout(() => toast.remove(), 5400);
  }
}

/**
 * RunTimer — The speedrun clock, top right: this level's time against its best,
 * or, in Trials, the run's time, wave and kills.
 */
export class RunTimer {
  private root: HTMLDivElement;
  private main: HTMLSpanElement;
  private sub: HTMLSpanElement;
  private shown = '';

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'run-timer';
    this.main = document.createElement('span');
    this.main.className = 'run-timer__main';
    this.sub = document.createElement('span');
    this.sub.className = 'run-timer__sub';
    this.root.append(this.main, this.sub);
    document.body.appendChild(this.root);
  }

  public hide(): void {
    this.root.classList.remove('run-timer--visible');
    this.shown = '';
  }

  /** A level in progress: its elapsed time, and the best clear to beat. */
  public showLevel(numeral: string, seconds: number, best: number | undefined, isDone: boolean): void {
    const isAhead = best === undefined || seconds <= best;
    this.set(`${numeral} · ${formatTime(seconds)}`, best !== undefined ? `Best ${formatTime(best)}` : 'No best yet',
      isDone ? (isAhead ? 'gold' : 'done') : isAhead ? '' : 'behind');
  }

  public showText(main: string, sub: string): void {
    this.set(main, sub, '');
  }

  private set(main: string, sub: string, state: string): void {
    const key = `${main}|${sub}|${state}`;
    if (key === this.shown) return;
    this.shown = key;
    this.main.textContent = main;
    this.sub.textContent = sub;
    this.root.dataset.state = state;
    this.root.classList.add('run-timer--visible');
  }
}
