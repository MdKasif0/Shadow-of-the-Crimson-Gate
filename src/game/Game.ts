import * as THREE from 'three';
import { Renderer } from './core/Renderer';
import { GameLoop } from './core/GameLoop';
import { InputManager } from './core/InputManager';
import { CameraController } from './core/CameraController';
import { GameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './GameConfig';

export class ThreeGame {
  private containerId: string;
  private renderer: Renderer;
  private loop: GameLoop;
  private input: InputManager;
  
  private gameScene: GameScene;
  private cameraController: CameraController;

  constructor(containerId: string) {
    this.containerId = containerId;
    
    // 1. Initialize core foundation
    this.renderer = new Renderer(containerId);
    this.input = new InputManager();
    
    // 2. Initialize scene
    this.gameScene = new GameScene();
    
    this.cameraController = new CameraController();

    // 4. Bind window events
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    // Initial size update
    this.onResize();

    // 5. Initialize Game Loop
    this.update = this.update.bind(this);
    this.render = this.render.bind(this);
    this.loop = new GameLoop(this.update, this.render);
    
    // Start the game!
    this.loop.start();
  }

  private update(dt: number): void {
    this.input.beginFrame();

    // Update scene logic
    this.gameScene.update(dt, this.input);

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
    this.renderer.destroy();
  }
}

export function init3DGame(containerId: string): ThreeGame {
  return new ThreeGame(containerId);
}
