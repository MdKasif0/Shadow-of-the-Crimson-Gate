import { GameStateManager } from '../state/GameStateManager';
import { GameState } from '../state/GameState';
import { SettingsMenu } from './SettingsMenu';
import { EventBus } from '../core/EventBus';

export class PauseMenu {
  public element: HTMLElement;
  private isPaused: boolean = false;

  constructor() {
    this.element = document.createElement('div');
    Object.assign(this.element.style, {
      position: 'absolute', inset: '0',
      background: 'rgba(0, 0, 0, 0.75)', zIndex: '20',
      display: 'none', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      pointerEvents: 'auto', backdropFilter: 'blur(5px)',
      color: 'white', fontFamily: "'Cinzel', 'Noto Serif JP', serif"
    });

    this.render();

    EventBus.on('gameStateChanged', (data: { current: GameState }) => {
      if (data.current === GameState.PAUSED) {
        this.element.style.display = 'flex';
        this.isPaused = true;
      } else {
        this.element.style.display = 'none';
        this.isPaused = false;
      }
    });
  }

  private render(): void {
    this.element.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px; text-align: center;">
        <h2 style="color: #fff; font-size: 48px; letter-spacing: 6px; margin-bottom: 20px;">PAUSED</h2>
        <button id="btn-resume" class="hero-nav__cta" style="width: 300px; justify-content: center; font-size: 16px;">RESUME</button>
        <button id="btn-restart" class="hero-nav__cta" style="width: 300px; justify-content: center; font-size: 16px;">RESTART FROM CHECKPOINT</button>
        <button id="btn-settings" class="hero-nav__cta" style="width: 300px; justify-content: center; font-size: 16px;">SETTINGS</button>
        <button id="btn-quit" class="hero-nav__cta" style="width: 300px; justify-content: center; font-size: 16px; border-color: #cc4444; color: #cc4444;">RETURN TO MAIN MENU</button>
      </div>
    `;

    // Wait a tick for innerHTML to be parsed
    setTimeout(() => {
      document.getElementById('btn-resume')?.addEventListener('click', () => {
        GameStateManager.getInstance().setState(GameState.PLAYING);
      });

      document.getElementById('btn-restart')?.addEventListener('click', () => {
        EventBus.emit('loadCheckpoint', {});
        GameStateManager.getInstance().setState(GameState.PLAYING);
      });

      document.getElementById('btn-settings')?.addEventListener('click', () => {
        new SettingsMenu(() => {});
      });

      document.getElementById('btn-quit')?.addEventListener('click', () => {
        if (confirm('Return to main menu? Unsaved progress will be lost.')) {
          GameStateManager.getInstance().setState(GameState.MAIN_MENU);
        }
      });
    }, 0);
  }

  public get paused(): boolean {
    return this.isPaused;
  }
}
