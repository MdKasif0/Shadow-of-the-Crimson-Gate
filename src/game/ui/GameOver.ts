import { EventBus } from '../core/EventBus';

/**
 * GameOver — Death and victory screen overlays.
 * Extracted from GameHUD for single-responsibility.
 */
export class GameOver {
  public element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.position = 'absolute';
    this.element.style.top = '45%';
    this.element.style.left = '50%';
    this.element.style.transform = 'translate(-50%, -50%)';
    this.element.style.textAlign = 'center';
    this.element.style.opacity = '0';
    this.element.style.transition = 'opacity 1s ease-in';
    this.element.style.pointerEvents = 'auto';
    this.element.style.fontFamily = "'Cinzel', serif";
    this.element.style.color = 'white';
  }

  public showDefeated(): void {
    this.show('DEFEATED', '#ff4444', true);
  }

  public showPurified(): void {
    this.show('PURIFIED', '#88ffff', false);
  }

  public hide(): void {
    this.element.style.opacity = '0';
  }

  private show(text: string, color: string, showRetry: boolean): void {
    this.element.innerHTML = '';
    const title = document.createElement('h1');
    title.innerText = text;
    title.style.color = color;
    title.style.fontSize = '4rem';
    title.style.letterSpacing = '0.3em';
    title.style.textShadow = '0 0 20px ' + color;
    this.element.appendChild(title);

    if (showRetry) {
      const btn = document.createElement('button');
      btn.innerText = 'RETRY';
      btn.style.background = 'transparent';
      btn.style.border = 'none';
      btn.style.color = '#ccc';
      btn.style.fontFamily = "'Cinzel', serif";
      btn.style.fontSize = '1.5rem';
      btn.style.letterSpacing = '0.1em';
      btn.style.marginTop = '20px';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'color 0.2s';
      btn.onmouseover = () => btn.style.color = '#fff';
      btn.onmouseout = () => btn.style.color = '#ccc';
      btn.onclick = () => {
        this.hide();
        EventBus.emit('restartEncounter');
      };
      this.element.appendChild(btn);
    }

    this.element.style.opacity = '1';

    if (!showRetry) {
      setTimeout(() => {
        this.element.style.opacity = '0';
      }, 3000);
    }
  }
}
