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
  private enemyNameElement!: HTMLElement;
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

    const levelIndicator = document.createElement('div');
    levelIndicator.id = 'hud-level';
    levelIndicator.innerText = 'LV.1';
    levelIndicator.style.fontSize = '1.0rem';
    levelIndicator.style.color = '#ffcc00';
    levelIndicator.style.marginBottom = '4px';
    levelIndicator.style.textShadow = '1px 1px 2px black';
    playerUI.appendChild(levelIndicator);

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
    this.playerHealthFill.style.transition = 'width 0.3s ease-out, background 0.3s';
    playerBarBg.appendChild(this.playerHealthFill);
    playerUI.appendChild(playerBarBg);

    const essenceIndicator = document.createElement('div');
    essenceIndicator.id = 'hud-essence';
    essenceIndicator.innerHTML = '✧ 0';
    essenceIndicator.style.fontSize = '1.0rem';
    essenceIndicator.style.color = '#88ffff';
    essenceIndicator.style.marginTop = '8px';
    essenceIndicator.style.textShadow = '1px 1px 2px black';
    essenceIndicator.style.transition = 'transform 0.1s';
    playerUI.appendChild(essenceIndicator);

    this.container.appendChild(playerUI);

    // Level up flash
    const levelUpFlash = document.createElement('div');
    levelUpFlash.id = 'hud-levelup';
    levelUpFlash.innerText = 'LEVEL UP';
    levelUpFlash.style.position = 'absolute';
    levelUpFlash.style.top = '30%';
    levelUpFlash.style.left = '50%';
    levelUpFlash.style.transform = 'translate(-50%, -50%)';
    levelUpFlash.style.fontSize = '3rem';
    levelUpFlash.style.color = '#ffcc00';
    levelUpFlash.style.textShadow = '0 0 20px #ffcc00';
    levelUpFlash.style.opacity = '0';
    levelUpFlash.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    this.container.appendChild(levelUpFlash);

    // 3. Enemy Health (Top Center, Hidden by default)
    this.enemyHealthContainer = document.createElement('div');
    this.enemyHealthContainer.style.position = 'absolute';
    this.enemyHealthContainer.style.top = '40px';
    this.enemyHealthContainer.style.left = '50%';
    this.enemyHealthContainer.style.transform = 'translateX(-50%)';
    this.enemyHealthContainer.style.textAlign = 'center';
    this.enemyHealthContainer.style.opacity = '0';
    this.enemyHealthContainer.style.transition = 'opacity 0.5s ease-in';

    this.enemyNameElement = document.createElement('div');
    this.enemyNameElement.innerText = 'ENEMY';
    this.enemyNameElement.style.fontSize = '1rem';
    this.enemyNameElement.style.letterSpacing = '0.1em';
    this.enemyNameElement.style.marginBottom = '6px';
    this.enemyNameElement.style.textShadow = '1px 1px 2px black';
    this.enemyHealthContainer.appendChild(this.enemyNameElement);

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

  private enemyHealthTimeout: any;

  private bindEvents() {
    EventBus.on('playerHealth', (data) => {
      const pct = Math.max(0, (data.current / data.max) * 100);
      this.playerHealthFill.style.width = `${pct}%`;
      
      // Color change on low HP
      if (pct < 30) {
        this.playerHealthFill.style.background = '#ff4444';
      } else {
        this.playerHealthFill.style.background = '#eeeeee';
      }

      if (data.current < data.max && data.delta < 0) {
        this.vignette.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0.5)';
        setTimeout(() => {
          this.vignette.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0)';
        }, 300);
      }
    });

    EventBus.on('enemyHealth', (data: any) => {
      const pct = Math.max(0, (data.current / data.max) * 100);
      this.enemyHealthFill.style.width = `${pct}%`;
      if (data.name) {
        this.enemyNameElement.innerText = data.name;
      }
      this.enemyHealthContainer.style.opacity = '1';
      
      clearTimeout(this.enemyHealthTimeout);
      this.enemyHealthTimeout = setTimeout(() => {
        this.enemyHealthContainer.style.opacity = '0';
      }, 3000);
    });

    EventBus.on('essenceUpdate', (data: any) => {
      const el = document.getElementById('hud-essence');
      if (el) {
        el.innerHTML = `✧ ${data.amount}`;
        el.style.transform = 'scale(1.2)';
        setTimeout(() => {
          el.style.transform = 'scale(1)';
        }, 150);
      }
    });

    EventBus.on('levelUp', (data: any) => {
      const el = document.getElementById('hud-level');
      if (el) el.innerText = `LV.${data.level}`;
      
      const flash = document.getElementById('hud-levelup');
      if (flash) {
        flash.style.opacity = '1';
        flash.style.transform = 'translate(-50%, -60%)';
        setTimeout(() => {
          flash.style.opacity = '0';
          flash.style.transform = 'translate(-50%, -50%)';
        }, 2000);
      }
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
