/** Reports load progress from 0 to 1, pausing so the browser can redraw when it's due. */
export type LoadReporter = (fraction: number, message?: string) => Promise<void>;

/** Longest stretch of work allowed before giving the browser a chance to paint. */
const MAX_WORK_MS = 32;
const FADE_OUT_MS = 900;

const HERO_IMAGE = '/assets/hero-bg-image.png';
/** Don't hold the menu back indefinitely on a slow connection. */
const ASSET_WAIT_LIMIT_MS = 6000;

/** Waits for the next frame, with a timeout because hidden tabs don't deliver frames. */
function nextPaint(): Promise<void> {
  return new Promise(resolve => {
    const timeout = setTimeout(resolve, 60);
    requestAnimationFrame(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

/** Maps a reporter onto part of the bar, so each stage can count from 0 to 1 itself. */
export function subProgress(report: LoadReporter, from: number, to: number): LoadReporter {
  return (fraction, message) => report(from + (to - from) * fraction, message);
}

/**
 * LoadingScreen — Drives the boot screen in index.html, which is already visible
 * before any JavaScript has run.
 */
export class LoadingScreen {
  private root: HTMLElement;
  private bar: HTMLElement;
  private track: HTMLElement;
  private message: HTMLElement;
  private percent: HTMLElement;
  private lastPaint: number = performance.now();
  private shownFraction: number = 0;
  private menuAssets: Promise<unknown>;

  constructor() {
    this.root = document.getElementById('boot-screen')!;
    this.bar = document.getElementById('boot-bar')!;
    this.track = document.getElementById('boot-track')!;
    this.message = document.getElementById('boot-message')!;
    this.percent = document.getElementById('boot-percent')!;

    // Fetched alongside the world from the start, rather than after it
    const image = new Image();
    image.src = HERO_IMAGE;
    this.menuAssets = Promise.allSettled([image.decode(), document.fonts.ready]);
  }

  public readonly report: LoadReporter = async (fraction, message) => {
    // Never let the bar run backwards
    this.shownFraction = Math.max(this.shownFraction, Math.min(fraction, 1));
    const percent = Math.round(this.shownFraction * 100);

    this.bar.style.transform = `scaleX(${this.shownFraction})`;
    this.percent.textContent = `${percent}%`;
    this.track.setAttribute('aria-valuenow', String(percent));
    if (message) this.message.textContent = message;

    if (performance.now() - this.lastPaint > MAX_WORK_MS) {
      await nextPaint();
      this.lastPaint = performance.now();
    }
  };

  /** Waits for the menu's artwork and fonts, so the menu doesn't appear half-styled. */
  public async waitForMenuAssets(): Promise<void> {
    const limit = new Promise(resolve => setTimeout(resolve, ASSET_WAIT_LIMIT_MS));
    await Promise.race([this.menuAssets, limit]);
  }

  public hide(): void {
    this.root.classList.add('boot-screen--done');
    setTimeout(() => this.root.remove(), FADE_OUT_MS);
  }

  public showError(): void {
    this.root.classList.add('boot-screen--error');
    this.message.textContent = 'The gate would not open. This game needs WebGL 2. Try updating your browser or enabling hardware acceleration, then reload.';
    this.message.setAttribute('role', 'alert');
  }
}
