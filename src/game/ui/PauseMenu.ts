import { EventBus } from '../core/EventBus';

/**
 * PauseMenu — Escape-triggered pause overlay.
 * Extracted from GameHUD for single-responsibility.
 */
export class PauseMenu {
  public element: HTMLElement;
  private isPaused: boolean = false;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.position = 'absolute';
    this.element.style.inset = '0';
    this.element.style.background = 'rgba(0, 0, 0, 0.8)';
    this.element.style.display = 'none';
    this.element.style.flexDirection = 'column';
    this.element.style.justifyContent = 'center';
    this.element.style.alignItems = 'center';
    this.element.style.pointerEvents = 'auto';
    this.element.style.zIndex = '20';
    this.element.style.fontFamily = "'Cinzel', serif";
    this.element.style.color = 'white';

    const pauseTitle = document.createElement('h2');
    pauseTitle.innerText = 'PAUSED';
    pauseTitle.style.fontSize = '3rem';
    pauseTitle.style.letterSpacing = '0.3em';
    pauseTitle.style.marginBottom = '2rem';
    this.element.appendChild(pauseTitle);

    const btnResume = this.createButton('RESUME');
    btnResume.onclick = () => this.toggle();

    const btnRestart = this.createButton('RESTART ENCOUNTER');
    btnRestart.onclick = () => {
      this.toggle();
      EventBus.emit('restartEncounter');
    };

    const btnMenu = this.createButton('RETURN TO MENU');
    btnMenu.onclick = () => {
      window.location.hash = '#/';
    };

    this.element.appendChild(btnResume);
    this.element.appendChild(btnRestart);
    this.element.appendChild(btnMenu);
  }

  private createButton(text: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.innerText = text;
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.color = '#ccc';
    btn.style.fontFamily = "'Cinzel', serif";
    btn.style.fontSize = '1.2rem';
    btn.style.letterSpacing = '0.1em';
    btn.style.margin = '10px 0';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'color 0.2s';
    btn.onmouseover = () => btn.style.color = '#fff';
    btn.onmouseout = () => btn.style.color = '#ccc';
    return btn;
  }

  public toggle(): void {
    this.isPaused = !this.isPaused;
    this.element.style.display = this.isPaused ? 'flex' : 'none';
    EventBus.emit('gamePauseToggled', this.isPaused);
  }

  public get paused(): boolean {
    return this.isPaused;
  }
}
