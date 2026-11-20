import { AudioManager } from '../audio/AudioManager';
import { AudioId } from '../audio/AudioRegistry';
import { LEVELS, LevelInfo } from '../levels/LevelCatalog';
import { LEVEL_ORDER, LevelId } from '../levels/LevelTypes';

export interface WorldMapContext {
  current: LevelId;
  unlocked: ReadonlySet<LevelId>;
  cleared: ReadonlySet<LevelId>;
  bestTimes: Partial<Record<LevelId, number>>;
  secretsFound: (level: LevelId) => number;
  /** The level to show first, such as the next one after a gate. */
  suggested?: LevelId;
  onTravel: (level: LevelId) => void;
  onClose: () => void;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The painted map of the mountain, with each level's gate. Travel happens from here. */
export class WorldMap {
  private overlay: HTMLDivElement | null = null;
  private context: WorldMapContext | null = null;
  private selected: LevelId = 'courtyard';

  public get isOpen(): boolean {
    return this.overlay !== null;
  }

  public open(context: WorldMapContext): void {
    if (this.overlay) return;
    this.context = context;
    this.selected = context.suggested ?? context.current;
    this.overlay = document.createElement('div');
    this.overlay.className = 'world-map game-overlay-enter';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'World map');
    document.body.appendChild(this.overlay);
    document.addEventListener('keydown', this.onKey, true);
    this.render();
    (this.overlay.querySelector('.world-map__travel:not([disabled]), .world-map__close') as HTMLElement | null)?.focus();
  }

  public close(): void {
    if (!this.overlay) return;
    document.removeEventListener('keydown', this.onKey, true);
    this.overlay.remove();
    this.overlay = null;
    const context = this.context;
    this.context = null;
    context?.onClose();
  }

  private onKey = (event: KeyboardEvent): void => {
    if (!this.context) return;
    if (event.code === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      AudioManager.playUIBack();
      this.close();
      return;
    }
    const step = event.code === 'ArrowRight' || event.code === 'ArrowUp' ? 1 : event.code === 'ArrowLeft' || event.code === 'ArrowDown' ? -1 : 0;
    if (step !== 0 && !(document.activeElement instanceof HTMLButtonElement && document.activeElement.classList.contains('world-map__travel'))) {
      event.preventDefault();
      const index = LEVEL_ORDER.indexOf(this.selected);
      const next = LEVEL_ORDER[Math.max(0, Math.min(LEVEL_ORDER.length - 1, index + step))];
      if (next !== this.selected) {
        this.selected = next;
        AudioManager.playUIHover();
        this.render();
        (this.overlay?.querySelector(`[data-level="${next}"]`) as HTMLElement | null)?.focus();
      }
    }
  };

  private render(): void {
    const overlay = this.overlay;
    const context = this.context;
    if (!overlay || !context) return;

    const nodes = LEVEL_ORDER.map(id => {
      const info = LEVELS[id];
      const state = context.cleared.has(id) ? 'cleared' : context.unlocked.has(id) ? 'open' : 'locked';
      const isHere = context.current === id;
      return `
        <button type="button" class="world-map__node world-map__node--${state} ${this.selected === id ? 'world-map__node--selected' : ''}"
          data-level="${id}" style="left:${info.map.x}%;top:${info.map.y}%" aria-pressed="${this.selected === id}"
          aria-label="${info.numeral}. ${info.name}${state === 'locked' ? ', sealed' : state === 'cleared' ? ', cleared' : ''}${isHere ? ', you are here' : ''}">
          <span class="world-map__numeral">${info.numeral}</span>
          ${isHere ? '<span class="world-map__here">You are here</span>' : ''}
          <span class="world-map__label">${state === 'locked' ? 'Sealed' : info.name.replace(/^The /, '')}</span>
        </button>`;
    }).join('');

    const pathPoints = LEVEL_ORDER.map(id => `${LEVELS[id].map.x},${LEVELS[id].map.y}`).join(' ');
    const info = LEVELS[this.selected];
    const panel = this.renderPanel(info, context);

    overlay.innerHTML = `
      <div class="world-map__frame">
        <div class="world-map__canvas">
          <svg class="world-map__art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="wm-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#2a1416"/><stop offset="0.55" stop-color="#1a1418"/><stop offset="1" stop-color="#121418"/>
              </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#wm-sky)"/>
            <path class="world-map__ridge world-map__ridge--far" d="M0 46 L12 30 L20 38 L31 20 L41 32 L50 6 L59 30 L70 18 L79 34 L88 24 L100 40 L100 100 L0 100 Z"/>
            <path class="world-map__ridge" d="M0 62 L10 50 L19 58 L28 44 L38 54 L47 40 L56 52 L66 38 L75 48 L84 36 L92 46 L100 42 L100 100 L0 100 Z"/>
            <path class="world-map__ridge world-map__ridge--near" d="M0 82 L8 72 L17 80 L26 68 L36 78 L46 70 L55 80 L63 72 L74 82 L84 74 L100 84 L100 100 L0 100 Z"/>
            <path class="world-map__river" d="M-2 66 C12 60 20 72 32 62 S48 58 58 70 S80 74 102 64"/>
            <polyline class="world-map__path" points="${pathPoints}"/>
            <path class="world-map__gate-glow" d="M46 10 h8 M47 10 v7 M53 10 v7"/>
          </svg>
          ${nodes}
        </div>
        <aside class="world-map__panel">${panel}</aside>
      </div>`;

    overlay.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(button => {
      button.addEventListener('mouseenter', () => AudioManager.playUIHover());
      button.addEventListener('click', () => {
        this.selected = button.dataset.level as LevelId;
        AudioManager.playUISelect();
        this.render();
        (this.overlay?.querySelector(`[data-level="${this.selected}"]`) as HTMLElement | null)?.focus();
      });
    });
    overlay.querySelector('.world-map__travel')?.addEventListener('click', () => {
      const ctx = this.context;
      if (!ctx || !ctx.unlocked.has(this.selected)) {
        AudioManager.play(AudioId.UI_ERROR);
        return;
      }
      AudioManager.playUIConfirm();
      const target = this.selected;
      // Travelling takes over from closing: the game stays paused for the load
      ctx.onClose = () => ctx.onTravel(target);
      this.close();
    });
    overlay.querySelector('.world-map__close')?.addEventListener('click', () => {
      AudioManager.playUIBack();
      this.close();
    });
  }

  private renderPanel(info: LevelInfo, context: WorldMapContext): string {
    const id = info.id;
    const isLocked = !context.unlocked.has(id);
    const isCleared = context.cleared.has(id);
    const best = context.bestTimes[id];
    const found = context.secretsFound(id);
    const total = info.secretIds.length;
    const isHere = context.current === id;
    const travelLabel = isLocked ? 'Sealed' : isHere ? 'Start again from the gate' : 'Travel here';

    return `
      <p class="world-map__eyebrow">Level ${info.numeral}${isCleared ? ' · Cleared' : ''}</p>
      <h2>${isLocked ? 'A Sealed Gate' : info.name}</h2>
      <p class="world-map__hook">${isLocked ? 'Defeat the guardian of the level before it to break this seal.' : info.hook}</p>
      ${isLocked ? '' : `
        <dl class="world-map__facts">
          <div><dt>Rule</dt><dd>${info.rule}</dd></div>
          <div><dt>Foes</dt><dd>${info.enemies}</dd></div>
          <div><dt>Guardian</dt><dd>${isCleared ? info.boss : '???'}</dd></div>
        </dl>
        <div class="world-map__stats">
          <div><span>${best !== undefined ? formatTime(best) : '—'}</span>Best time</div>
          <div><span>${found} / ${total}</span>Secrets</div>
        </div>`}
      <div class="world-map__actions">
        <button type="button" class="hero-nav__cta world-map__travel" ${isLocked ? 'disabled' : ''}>${travelLabel}</button>
        <button type="button" class="hero-nav__cta world-map__close">Close <span>Esc</span></button>
      </div>`;
  }
}

/** The card shown while a level is built: its name, its rule, and a bar. */
export class LevelLoadingCard {
  private root: HTMLDivElement | null = null;
  private bar: HTMLElement | null = null;

  public show(info: LevelInfo): void {
    this.hide(true);
    const root = document.createElement('div');
    root.className = 'level-card';
    root.setAttribute('role', 'status');
    root.innerHTML = `
      <div class="level-card__inner">
        <p class="level-card__numeral">${info.numeral}</p>
        <h2 class="level-card__name">${info.name}</h2>
        <p class="level-card__hook">${info.hook}</p>
        <p class="level-card__rule">${info.rule}</p>
        <div class="level-card__track"><div class="level-card__bar"></div></div>
      </div>`;
    document.body.appendChild(root);
    this.root = root;
    this.bar = root.querySelector('.level-card__bar');
    requestAnimationFrame(() => root.classList.add('level-card--visible'));
  }

  public progress(fraction: number): void {
    if (this.bar) this.bar.style.transform = `scaleX(${Math.max(0, Math.min(1, fraction))})`;
  }

  public hide(immediately = false): void {
    const root = this.root;
    if (!root) return;
    this.root = null;
    this.bar = null;
    if (immediately) {
      root.remove();
      return;
    }
    root.classList.remove('level-card--visible');
    setTimeout(() => root.remove(), 800);
  }
}

/** A countdown across the top of the screen, for escapes and the like. */
export class LevelCountdown {
  private root: HTMLDivElement;
  private shown = '';

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'level-countdown';
    this.root.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.root);
  }

  public set(label: string, seconds: number | null): void {
    if (seconds === null) {
      if (this.shown) {
        this.shown = '';
        this.root.classList.remove('level-countdown--visible');
      }
      return;
    }
    const text = `${label} · ${formatTime(Math.ceil(seconds))}`;
    if (text === this.shown) return;
    this.shown = text;
    this.root.textContent = text;
    this.root.classList.add('level-countdown--visible');
    this.root.classList.toggle('level-countdown--urgent', seconds < 10);
  }
}
