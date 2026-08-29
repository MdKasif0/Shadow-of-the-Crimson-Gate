import * as THREE from 'three';
import { Renderer } from './core/Renderer';
import { GameLoop } from './core/GameLoop';
import { InputManager } from './core/InputManager';
import { CameraController } from './camera/CameraController';
import { GameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './GameConfig';
import { GameHUD } from './ui/GameHUD';
import { EventBus } from './core/EventBus';
import { GameStateManager } from './state/GameStateManager';
import { GameState } from './state/GameState';
import { PauseMenu } from './ui/PauseMenu';
import { GameOverUI } from './ui/GameOverUI';
import { EpilogueUI } from './ui/EpilogueUI';
import { ScreenEffectsUI } from './ui/ScreenEffectsUI';

export class ThreeGame {
  private containerId: string;
  private renderer: Renderer;
  private loop: GameLoop;
  private input: InputManager;
  
  private gameScene: GameScene;
  private cameraController: CameraController;
  private hud: GameHUD;
  private pauseMenu: PauseMenu;
  private gameOverUI: GameOverUI;
  private epilogueUI: EpilogueUI;
  private screenEffectsUI: ScreenEffectsUI;

  constructor(containerId: string) {
    this.containerId = containerId;
    
    // 1. Initialize core foundation
    this.renderer = new Renderer(containerId);
    this.input = new InputManager();
    
    this.cameraController = new CameraController();

    // 2. Initialize scene
    this.gameScene = new GameScene(this.cameraController);
    
    // 3. Initialize HUD & Menus
    this.hud = new GameHUD(containerId);
    this.pauseMenu = new PauseMenu();
    this.gameOverUI = new GameOverUI();
    this.epilogueUI = new EpilogueUI();
    this.screenEffectsUI = new ScreenEffectsUI();
    
    // 4. Bind window events
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    // Initial size update
    this.onResize();

    // 5. Initialize Game Loop
    this.update = this.update.bind(this);
    this.render = this.render.bind(this);
    this.loop = new GameLoop(this.update, this.render);
    
    // Start the game loop!
    this.loop.start();
  }

  private update(dt: number): void {
    this.input.beginFrame();

    const state = GameStateManager.getInstance().getState();

    // Handle Escape for pause toggle
    if (state === GameState.PLAYING && this.input.isPressed('Escape')) {
      GameStateManager.getInstance().setState(GameState.PAUSED);
      this.input.keys['Escape'] = false; // consume
    } else if (state === GameState.PAUSED && this.input.isPressed('Escape')) {
      GameStateManager.getInstance().setState(GameState.PLAYING);
      this.input.keys['Escape'] = false; // consume
    }

    // Freeze game simulation if paused or in menu
    if (state === GameState.PLAYING || state === GameState.BOSS) {
      // Update scene logic
      this.gameScene.update(dt, this.input);
    }


    // Update camera to follow player
    this.cameraController.update(this.gameScene.player.root.position, dt);

    // Optional Debug overlay (e.g., exit debug command)
    if (GAME_CONFIG.DEBUG_MODE && this.input.isPressed('KeyP')) {
      console.log('Pause/Debug requested');
      this.input.keys['KeyP'] = false;
    }

    this.input.endFrame();
  }

  private render(): void {
    this.renderer.render(this.gameScene.scene, this.cameraController.camera);
  }

  private onResize(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.cameraController.resize(width, height);
    
    this.renderer.resize();
  }

  public destroy(): void {
    this.loop.stop();
    window.removeEventListener('resize', this.onResize);
    this.input.dispose();
    this.hud.destroy();
    this.renderer.destroy();
  }
}

export function init3DGame(containerId: string): ThreeGame {
  return new ThreeGame(containerId);
}
