import { EventBus } from '../core/EventBus';

export class GameHUD {
  private container: HTMLElement;
  private isPaused: boolean = false;
  
  // DOM Elements
  private playerHealthFill!: HTMLElement;
  private enemyHealthContainer!: HTMLElement;
  private enemyHealthFill!: HTMLElement;
  private centerMessage!: HTMLElement;
  private pauseMenu!: HTMLElement;
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
    this.container.style.pointerEvents = 'none'; // Let clicks pass through to canvas
    this.container.style.zIndex = '10';
    this.container.style.fontFamily = "'Cinzel', serif";
    this.container.style.color = 'white';
    parent.appendChild(this.container);

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

    // 4. Center Message (Defeated, Purified)
    this.centerMessage = document.createElement('div');
    this.centerMessage.style.position = 'absolute';
    this.centerMessage.style.top = '45%';
    this.centerMessage.style.left = '50%';
    this.centerMessage.style.transform = 'translate(-50%, -50%)';
    this.centerMessage.style.textAlign = 'center';
    this.centerMessage.style.opacity = '0';
    this.centerMessage.style.transition = 'opacity 1s ease-in';
    this.centerMessage.style.pointerEvents = 'auto'; // allow clicking retry
    this.container.appendChild(this.centerMessage);

    // 5. Pause Menu
    this.pauseMenu = document.createElement('div');
    this.pauseMenu.style.position = 'absolute';
    this.pauseMenu.style.inset = '0';
    this.pauseMenu.style.background = 'rgba(0, 0, 0, 0.8)';
    this.pauseMenu.style.display = 'none';
    this.pauseMenu.style.flexDirection = 'column';
    this.pauseMenu.style.justifyContent = 'center';
    this.pauseMenu.style.alignItems = 'center';
    this.pauseMenu.style.pointerEvents = 'auto';
    this.pauseMenu.style.zIndex = '20';

    const pauseTitle = document.createElement('h2');
    pauseTitle.innerText = 'PAUSED';
    pauseTitle.style.fontSize = '3rem';
    pauseTitle.style.letterSpacing = '0.3em';
    pauseTitle.style.marginBottom = '2rem';
    this.pauseMenu.appendChild(pauseTitle);

    const btnResume = this.createMenuButton('RESUME');
    btnResume.onclick = () => this.togglePause();
    
    const btnRestart = this.createMenuButton('RESTART ENCOUNTER');
    btnRestart.onclick = () => {
      this.togglePause();
      EventBus.emit('restartEncounter');
    };
    
    const btnMenu = this.createMenuButton('RETURN TO MENU');
    btnMenu.onclick = () => {
      // Typically we'd route back, for now just hardcode hash
      window.location.hash = '#/';
    };

    this.pauseMenu.appendChild(btnResume);
    this.pauseMenu.appendChild(btnRestart);
    this.pauseMenu.appendChild(btnMenu);
    this.container.appendChild(this.pauseMenu);
  }

  private createMenuButton(text: string): HTMLButtonElement {
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

  private bindEvents() {
    EventBus.on('playerHealth', (data) => {
      const pct = Math.max(0, (data.current / data.max) * 100);
      this.playerHealthFill.style.width = `${pct}%`;
      // Damage Vignette
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
      this.showCenterMessage('PURIFIED', '#88ffff', true);
    });

    EventBus.on('playerDeath', () => {
      this.showCenterMessage('DEFEATED', '#ff4444', false, true);
    });

    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      this.togglePause();
    }
  };

  private togglePause() {
    this.isPaused = !this.isPaused;
    this.pauseMenu.style.display = this.isPaused ? 'flex' : 'none';
    EventBus.emit('gamePauseToggled', this.isPaused);
  }

  private showCenterMessage(text: string, color: string, autoHide: boolean, showRetry: boolean = false) {
    this.centerMessage.innerHTML = '';
    const title = document.createElement('h1');
    title.innerText = text;
    title.style.color = color;
    title.style.fontSize = '4rem';
    title.style.letterSpacing = '0.3em';
    title.style.textShadow = '0 0 20px ' + color;
    this.centerMessage.appendChild(title);

    if (showRetry) {
      const btn = this.createMenuButton('RETRY');
      btn.style.marginTop = '20px';
      btn.style.fontSize = '1.5rem';
      btn.onclick = () => {
        this.centerMessage.style.opacity = '0';
        EventBus.emit('restartEncounter');
      };
      this.centerMessage.appendChild(btn);
    }

    this.centerMessage.style.opacity = '1';

    if (autoHide) {
      setTimeout(() => {
        this.centerMessage.style.opacity = '0';
      }, 3000);
    }
  }

  public destroy() {
    EventBus.clear();
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
