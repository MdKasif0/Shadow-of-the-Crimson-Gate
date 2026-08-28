// ─── Dialogue Box ───────────────────────────────────────────────────────────
// Cinematic dialogue UI overlay with typewriter text reveal.

export class DialogueBox {
  private overlay: HTMLDivElement;
  private letterboxTop: HTMLDivElement;
  private letterboxBottom: HTMLDivElement;
  private box: HTMLDivElement;
  private speakerEl: HTMLDivElement;
  private textEl: HTMLDivElement;
  private continueEl: HTMLDivElement;
  private choicesEl: HTMLDivElement;

  private isVisible: boolean = false;
  private fullText: string = '';
  private displayedChars: number = 0;
  private typewriterInterval: number | null = null;
  private typeSpeed: number = 30; // ms per character
  private isTextComplete: boolean = false;

  private onAdvance: (() => void) | null = null;
  private onChoiceSelect: ((choiceIndex: number) => void) | null = null;

  constructor() {
    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'dialogue-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      zIndex: '500', pointerEvents: 'none', opacity: '0',
      transition: 'opacity 0.4s ease',
    });

    // Letterbox bars
    this.letterboxTop = this.createLetterbox('top');
    this.letterboxBottom = this.createLetterbox('bottom');
    this.overlay.appendChild(this.letterboxTop);
    this.overlay.appendChild(this.letterboxBottom);

    // Dialogue Box
    this.box = document.createElement('div');
    Object.assign(this.box.style, {
      position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
      width: 'min(800px, 85vw)', padding: '24px 32px',
      background: 'linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(5,5,10,0.98) 100%)',
      border: '1px solid rgba(120,30,30,0.5)',
      borderRadius: '4px',
      boxShadow: '0 0 40px rgba(100,20,20,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
    });

    // Speaker Name
    this.speakerEl = document.createElement('div');
    Object.assign(this.speakerEl.style, {
      color: '#cc4444', fontFamily: "'Noto Serif JP', serif, monospace",
      fontSize: '14px', letterSpacing: '4px', textTransform: 'uppercase',
      marginBottom: '12px', fontWeight: '700',
    });

    // Text
    this.textEl = document.createElement('div');
    Object.assign(this.textEl.style, {
      color: '#d0ccc0', fontFamily: "'Noto Serif JP', serif, monospace",
      fontSize: '18px', lineHeight: '1.7', letterSpacing: '0.5px',
      minHeight: '60px',
    });

    // Continue Indicator
    this.continueEl = document.createElement('div');
    Object.assign(this.continueEl.style, {
      color: '#888', fontFamily: 'monospace', fontSize: '12px',
      textAlign: 'right', marginTop: '12px', opacity: '0',
      transition: 'opacity 0.3s', letterSpacing: '2px',
    });
    this.continueEl.textContent = '▶ CONTINUE';

    // Choices Container
    this.choicesEl = document.createElement('div');
    Object.assign(this.choicesEl.style, {
      marginTop: '16px', display: 'none',
    });

    this.box.appendChild(this.speakerEl);
    this.box.appendChild(this.textEl);
    this.box.appendChild(this.continueEl);
    this.box.appendChild(this.choicesEl);
    this.overlay.appendChild(this.box);

    document.body.appendChild(this.overlay);

    // Input handler
    this.handleInput = this.handleInput.bind(this);
  }

  private createLetterbox(position: 'top' | 'bottom'): HTMLDivElement {
    const bar = document.createElement('div');
    Object.assign(bar.style, {
      position: 'absolute', left: '0', width: '100%', height: '0px',
      background: '#000', transition: 'height 0.6s ease',
      [position]: '0',
    });
    return bar;
  }

  public show(speaker: string, text: string, onAdvance: () => void, choices?: { label: string }[]): void {
    this.fullText = text;
    this.displayedChars = 0;
    this.isTextComplete = false;
    this.onAdvance = onAdvance;

    this.speakerEl.textContent = speaker;
    this.textEl.textContent = '';
    this.continueEl.style.opacity = '0';

    // Choices
    this.choicesEl.innerHTML = '';
    this.choicesEl.style.display = 'none';

    if (choices && choices.length > 0) {
      this.choicesEl.style.display = 'block';
      choices.forEach((choice, index) => {
        const btn = document.createElement('div');
        Object.assign(btn.style, {
          color: '#aaa', fontFamily: 'monospace', fontSize: '14px',
          padding: '8px 16px', marginBottom: '4px', cursor: 'pointer',
          border: '1px solid rgba(120,30,30,0.3)', borderRadius: '2px',
          transition: 'all 0.2s', letterSpacing: '1px', pointerEvents: 'auto',
        });
        btn.textContent = `› ${choice.label}`;
        btn.addEventListener('mouseenter', () => { btn.style.color = '#cc4444'; btn.style.borderColor = 'rgba(200,50,50,0.6)'; });
        btn.addEventListener('mouseleave', () => { btn.style.color = '#aaa'; btn.style.borderColor = 'rgba(120,30,30,0.3)'; });
        btn.addEventListener('click', () => {
          if (this.onChoiceSelect) this.onChoiceSelect(index);
        });
        this.choicesEl.appendChild(btn);
      });
    }

    if (!this.isVisible) {
      this.isVisible = true;
      this.overlay.style.opacity = '1';
      this.overlay.style.pointerEvents = 'auto';
      this.letterboxTop.style.height = '60px';
      this.letterboxBottom.style.height = '60px';
      window.addEventListener('keydown', this.handleInput);
      window.addEventListener('click', this.handleInput);
    }

    this.startTypewriter();
  }

  public hide(): void {
    this.isVisible = false;
    this.stopTypewriter();
    this.overlay.style.opacity = '0';
    this.overlay.style.pointerEvents = 'none';
    this.letterboxTop.style.height = '0px';
    this.letterboxBottom.style.height = '0px';
    window.removeEventListener('keydown', this.handleInput);
    window.removeEventListener('click', this.handleInput);
  }

  public setChoiceCallback(cb: (index: number) => void): void {
    this.onChoiceSelect = cb;
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  private startTypewriter(): void {
    this.stopTypewriter();
    this.typewriterInterval = window.setInterval(() => {
      if (this.displayedChars < this.fullText.length) {
        this.displayedChars++;
        this.textEl.textContent = this.fullText.substring(0, this.displayedChars);
      } else {
        this.finishText();
      }
    }, this.typeSpeed);
  }

  private stopTypewriter(): void {
    if (this.typewriterInterval !== null) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
  }

  private finishText(): void {
    this.stopTypewriter();
    this.displayedChars = this.fullText.length;
    this.textEl.textContent = this.fullText;
    this.isTextComplete = true;
    this.continueEl.style.opacity = '1';
  }

  private handleInput(e: Event): void {
    // Block all non-dialogue keys
    if (e instanceof KeyboardEvent) {
      if (!['Enter', 'Space', 'KeyE'].includes(e.code)) return;
      e.preventDefault();
    }

    if (!this.isTextComplete) {
      // Fast-forward text
      this.finishText();
    } else {
      // Advance dialogue
      if (this.onAdvance) this.onAdvance();
    }
  }

  public dispose(): void {
    this.hide();
    this.overlay.remove();
  }
}
