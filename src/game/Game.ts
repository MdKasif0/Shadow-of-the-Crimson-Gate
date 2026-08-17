import { Renderer } from './core/Renderer';
import { Clock } from './core/Clock';
import { AssetManager } from './core/AssetManager';
import { CameraController } from './camera/CameraController';
import { CombatScene } from './scenes/CombatScene';
import { GAME_CONFIG } from './GameConfig';
import { ASSET_PATHS } from './config/AssetConfig';

export class ThreeGame {
  private renderer: Renderer;
  private clock: Clock;
  private assetManager: AssetManager;
  private cameraController: CameraController;
  private combatScene: CombatScene | null = null;
  
  private isRunning: boolean = false;
  private animationFrameId: number = 0;
  private containerId: string;

  constructor(containerId: string) {
    this.containerId = containerId;
    this.renderer = new Renderer(containerId);
    this.clock = new Clock();
    this.assetManager = new AssetManager();
    this.cameraController = new CameraController(containerId);

    // Bind methods
    this.loop = this.loop.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    window.addEventListener('resize', this.onWindowResize);
    
    this.init();
  }

  private async init(): Promise<void> {
    this.showLoadingScreen();
    await this.loadAssets();
    this.createScene();

    // Start the game loop
    this.isRunning = true;
    this.clock.start();
    this.loop();
  }

  private showLoadingScreen(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    let loadingScreen = document.getElementById('game-loading-screen');
    if (!loadingScreen) {
      loadingScreen = document.createElement('div');
      loadingScreen.id = 'game-loading-screen';
      loadingScreen.style.position = 'absolute';
      loadingScreen.style.top = '0';
      loadingScreen.style.left = '0';
      loadingScreen.style.width = '100%';
      loadingScreen.style.height = '100%';
      loadingScreen.style.backgroundColor = '#000';
      loadingScreen.style.color = '#fff';
      loadingScreen.style.display = 'flex';
      loadingScreen.style.flexDirection = 'column';
      loadingScreen.style.alignItems = 'center';
      loadingScreen.style.justifyContent = 'center';
      loadingScreen.style.zIndex = '9999';
      loadingScreen.style.fontFamily = 'monospace';
      loadingScreen.style.transition = 'opacity 0.5s ease-out';

      loadingScreen.innerHTML = `
        <h1 style="color: #ff3344; letter-spacing: 0.2em; text-transform: uppercase;">Shadow of the Crimson Gate</h1>
        <p style="margin-top: 1rem; color: #88aadd;">Loading World...</p>
        <div style="width: 300px; height: 4px; background: #333; margin-top: 1rem;">
          <div id="game-loading-bar" style="width: 0%; height: 100%; background: #ff3344; transition: width 0.1s;"></div>
        </div>
        <p id="game-loading-text" style="margin-top: 0.5rem; color: #88aadd;">0%</p>
      `;
      container.appendChild(loadingScreen);
    }
  }

  private hideLoadingScreen(): void {
    const loadingScreen = document.getElementById('game-loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => loadingScreen.remove(), 500);
    }
  }

  private async loadAssets(): Promise<void> {
    const allPaths = Object.values(ASSET_PATHS.MODELS);
    
    await this.assetManager.loadAll(allPaths, (progress) => {
      const bar = document.getElementById('game-loading-bar');
      const text = document.getElementById('game-loading-text');
      const percent = Math.round(progress * 100);
      
      if (bar) bar.style.width = `${percent}%`;
      if (text) text.innerText = `${percent}%`;
    });
    
    this.hideLoadingScreen();
  }

  private createScene(): void {
    // Initialize the scene (assets are already cached)
    this.combatScene = new CombatScene(this.assetManager);
    
    // Set the camera to follow the player
    this.cameraController.setTarget(this.combatScene.player.playerRoot);
  }

  private loop(): void {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.loop);

    const deltaTime = this.clock.update();

    if (this.combatScene) {
      this.combatScene.update(deltaTime);
      this.cameraController.update(deltaTime);
      this.renderer.render(this.combatScene.scene, this.cameraController.camera);
    }
    
    this.renderDebug();
  }

  private renderDebug(): void {
    if (!GAME_CONFIG.DEBUG_MODE || !this.combatScene) return;
    
    // Quick debug overlay logic without React
    let debugUI = document.getElementById('debug-ui');
    if (!debugUI) {
      debugUI = document.createElement('div');
      debugUI.id = 'debug-ui';
      debugUI.style.position = 'absolute';
      debugUI.style.top = '10px';
      debugUI.style.left = '10px';
      debugUI.style.color = 'lime';
      debugUI.style.fontFamily = 'monospace';
      debugUI.style.backgroundColor = 'rgba(0,0,0,0.5)';
      debugUI.style.padding = '10px';
      debugUI.style.pointerEvents = 'none';
      debugUI.style.zIndex = '10000';
      document.body.appendChild(debugUI);
    }

    const fps = Math.round(1 / this.clock.getDelta());
    const pos = this.combatScene.player.playerRoot.position;
    const cam = this.cameraController.camera.position;
    const combatState = this.combatScene.player.combatSystem.getPlayerState();
    const combatTimer = this.combatScene.player.combatSystem.getAttackTimer();

    debugUI.innerHTML = `
      FPS: ${fps}<br/>
      Player: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})<br/>
      Camera: (${cam.x.toFixed(2)}, ${cam.y.toFixed(2)}, ${cam.z.toFixed(2)})<br/>
      Combat State: <span style="color: yellow;">${combatState.toUpperCase()}</span><br/>
      Attack Timer: ${combatTimer.toFixed(3)}s
    `;
  }

  private onWindowResize(): void {
    this.renderer.resize();
    this.cameraController.resize();
  }

  public destroy(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    
    if (this.combatScene) {
      this.combatScene.dispose();
    }
    
    this.renderer.destroy();

    const debugUI = document.getElementById('debug-ui');
    if (debugUI) debugUI.remove();
  }
}

// Global factory for the router to use
export function init3DGame(containerId: string): ThreeGame {
  return new ThreeGame(containerId);
}
