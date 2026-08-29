import { GameStateManager } from '../state/GameStateManager';
import { GameState } from '../state/GameState';
import { EventBus } from '../core/EventBus';

export class GameOverUI {
  private overlay: HTMLDivElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'game-over-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(20, 0, 0, 0.95)', zIndex: '2000',
      display: 'none', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: '0', transition: 'opacity 3s ease',
      color: '#fff', fontFamily: "'Noto Serif JP', serif",
    });

    this.render();
    document.body.appendChild(this.overlay);

    EventBus.on('gameStateChanged', (data: { current: GameState }) => {
      if (data.current === GameState.GAME_OVER) {
        this.overlay.style.display = 'flex';
        setTimeout(() => {
          this.overlay.style.opacity = '1';
        }, 100);
      } else {
        this.overlay.style.opacity = '0';
        setTimeout(() => {
          this.overlay.style.display = 'none';
        }, 3000);
      }
    });
  }

  private render(): void {
    this.overlay.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 30px; text-align: center;">
        <h2 style="color: #cc4444; font-size: 64px; letter-spacing: 8px; margin-bottom: 40px; text-shadow: 0 0 20px rgba(200,0,0,0.5);">DEATH</h2>
        <button id="btn-retry" class="hero-nav__cta" style="width: 300px; justify-content: center; font-size: 16px;">RETRY FROM CHECKPOINT</button>
        <button id="btn-quit-death" class="hero-nav__cta" style="width: 300px; justify-content: center; font-size: 16px;">RETURN TO MAIN MENU</button>
      </div>
    `;

    setTimeout(() => {
      document.getElementById('btn-retry')?.addEventListener('click', () => {
        EventBus.emit('loadCheckpoint', {});
        GameStateManager.getInstance().setState(GameState.PLAYING);
      });

      document.getElementById('btn-quit-death')?.addEventListener('click', () => {
        GameStateManager.getInstance().setState(GameState.MAIN_MENU);
      });
    }, 0);
  }
}
