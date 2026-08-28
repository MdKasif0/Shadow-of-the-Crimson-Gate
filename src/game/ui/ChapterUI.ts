// ─── Chapter UI ─────────────────────────────────────────────────────────────
// Shows chapter title cards: "CHAPTER I — The Silent Gate"

import { EventBus } from '../core/EventBus';
import { StoryEvents } from '../story/StoryEvent';
import { ChapterDef } from '../story/StoryChapter';

export class ChapterUI {
  private overlay: HTMLDivElement;
  private numberEl: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private lineEl: HTMLDivElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'chapter-ui-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      zIndex: '550', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', opacity: '0',
      transition: 'opacity 1.2s ease',
    });

    this.numberEl = document.createElement('div');
    Object.assign(this.numberEl.style, {
      color: '#cc4444', fontFamily: "'Noto Serif JP', serif, monospace",
      fontSize: '14px', letterSpacing: '8px', textTransform: 'uppercase',
      marginBottom: '8px', fontWeight: '400',
    });

    this.lineEl = document.createElement('div');
    Object.assign(this.lineEl.style, {
      width: '60px', height: '1px', background: 'rgba(180,50,50,0.6)',
      margin: '12px 0',
    });

    this.titleEl = document.createElement('div');
    Object.assign(this.titleEl.style, {
      color: '#d0ccc0', fontFamily: "'Noto Serif JP', serif, monospace",
      fontSize: '36px', letterSpacing: '4px', fontWeight: '300',
      textShadow: '0 2px 20px rgba(0,0,0,0.8)',
    });

    this.overlay.appendChild(this.numberEl);
    this.overlay.appendChild(this.lineEl);
    this.overlay.appendChild(this.titleEl);
    document.body.appendChild(this.overlay);

    EventBus.on(StoryEvents.CHAPTER_START, (data: { chapter: ChapterDef }) => {
      this.show(data.chapter);
    });
  }

  public show(chapter: ChapterDef): void {
    this.numberEl.textContent = `CHAPTER ${chapter.number}`;
    this.titleEl.textContent = chapter.title;

    // Fade in
    this.overlay.style.opacity = '1';

    // Hold for 3 seconds, then fade out
    setTimeout(() => {
      this.overlay.style.opacity = '0';
    }, 3500);
  }

  public dispose(): void {
    this.overlay.remove();
  }
}
