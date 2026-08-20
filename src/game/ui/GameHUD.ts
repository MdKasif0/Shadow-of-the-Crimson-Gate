import { EventBus } from '../core/EventBus';
import { PauseMenu } from './PauseMenu';
import { GameOver } from './GameOver';

/**
 * GameHUD — Cinematic HTML overlay composed from PauseMenu and GameOver submodules.
 */
export class GameHUD {
  private container: HTMLElement;

  // Submodules
  private pauseMenu: PauseMenu;
  private gameOver: GameOver;

  // DOM Elements
  private playerHealthFill!: HTMLElement;
  private enemyHealthContainer!: HTMLElement;
  private enemyHealthFill!: HTMLElement;
  private vignette!: HTMLElement;

  constructor(containerId: string) {
    const parent = document.getElementById(containerId);
    if (!parent) throw new Error('HUD container not found');

    this.container = document.createElement('div');
    this.container.id = 'game-hud';
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '10';
    this.container.style.fontFamily = "'Cinzel', serif";
    this.container.style.color = 'white';
    parent.appendChild(this.container);

    this.pauseMenu = new PauseMenu();
    this.gameOver = new GameOver();

    this.buildUI();
    this.bindEvents();
  }

  private buildUI() {
    // 1. Damage Vignette
    this.vignette = document.createElement('div');
    this.vignette.style.position = 'absolute';
    this.vignette.style.inset = '0';
    this.vignette.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0)';
    this.vignette.style.transition = 'box-shadow 0.2s ease-out';
    this.container.appendChild(this.vignette);

    // 2. Player Health (Bottom Left)
    const playerUI = document.createElement('div');
    playerUI.style.position = 'absolute';
    playerUI.style.bottom = '40px';
    playerUI.style.left = '40px';

    const playerName = document.createElement('div');
    playerName.innerText = 'RONIN';
    playerName.style.fontSize = '1.2rem';
    playerName.style.letterSpacing = '0.2em';
    playerName.style.marginBottom = '8px';
    playerName.style.textShadow = '1px 1px 2px black';
    playerUI.appendChild(playerName);

    const playerBarBg = document.createElement('div');
    playerBarBg.style.width = '200px';
    playerBarBg.style.height = '6px';
    playerBarBg.style.background = 'rgba(255, 255, 255, 0.2)';
    playerBarBg.style.boxShadow = '0 0 4px rgba(0,0,0,0.5)';

    this.playerHealthFill = document.createElement('div');
    this.playerHealthFill.style.width = '100%';
    this.playerHealthFill.style.height = '100%';
    this.playerHealthFill.style.background = '#eeeeee';
    this.playerHealthFill.style.transition = 'width 0.3s ease-out';
    playerBarBg.appendChild(this.playerHealthFill);
    playerUI.appendChild(playerBarBg);

    this.container.appendChild(playerUI);

    // 3. Enemy Health (Top Center, Hidden by default)
    this.enemyHealthContainer = document.createElement('div');
    this.enemyHealthContainer.style.position = 'absolute';
    this.enemyHealthContainer.style.top = '40px';
    this.enemyHealthContainer.style.left = '50%';
    this.enemyHealthContainer.style.transform = 'translateX(-50%)';
    this.enemyHealthContainer.style.textAlign = 'center';
    this.enemyHealthContainer.style.opacity = '0';
    this.enemyHealthContainer.style.transition = 'opacity 0.5s ease-in';

    const enemyName = document.createElement('div');
    enemyName.innerText = 'BASIC YOKAI';
    enemyName.style.fontSize = '1rem';
    enemyName.style.letterSpacing = '0.1em';
    enemyName.style.marginBottom = '6px';
    enemyName.style.textShadow = '1px 1px 2px black';
    this.enemyHealthContainer.appendChild(enemyName);

    const enemyBarBg = document.createElement('div');
    enemyBarBg.style.width = '300px';
    enemyBarBg.style.height = '4px';
    enemyBarBg.style.background = 'rgba(255, 255, 255, 0.2)';
    enemyBarBg.style.boxShadow = '0 0 4px rgba(0,0,0,0.5)';

    this.enemyHealthFill = document.createElement('div');
    this.enemyHealthFill.style.width = '100%';
    this.enemyHealthFill.style.height = '100%';
    this.enemyHealthFill.style.background = '#ff4444';
    this.enemyHealthFill.style.transition = 'width 0.3s ease-out';
    enemyBarBg.appendChild(this.enemyHealthFill);

    this.enemyHealthContainer.appendChild(enemyBarBg);
    this.container.appendChild(this.enemyHealthContainer);

    // 4. Game Over overlay
    this.container.appendChild(this.gameOver.element);

    // 5. Pause Menu overlay
    this.container.appendChild(this.pauseMenu.element);
  }

  private bindEvents() {
    EventBus.on('playerHealth', (data) => {
      const pct = Math.max(0, (data.current / data.max) * 100);
      this.playerHealthFill.style.width = `${pct}%`;
      if (data.current < data.max && data.delta < 0) {
        this.vignette.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0.5)';
        setTimeout(() => {
          this.vignette.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0)';
        }, 300);
      }
    });

    EventBus.on('enemyHealth', (data) => {
      const pct = Math.max(0, (data.current / data.max) * 100);
      this.enemyHealthFill.style.width = `${pct}%`;
    });

    EventBus.on('encounterStarted', () => {
      this.enemyHealthContainer.style.opacity = '1';
    });

    EventBus.on('encounterComplete', () => {
      this.enemyHealthContainer.style.opacity = '0';
      this.gameOver.showPurified();
    });

    EventBus.on('playerDeath', () => {
      this.gameOver.showDefeated();
    });

    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      this.pauseMenu.toggle();
    }
  };

  public destroy() {
    EventBus.clear();
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
