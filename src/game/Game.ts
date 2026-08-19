import * as THREE from 'three';
import { Renderer } from './core/Renderer';
import { GameLoop } from './core/GameLoop';
import { InputManager } from './core/InputManager';
import { GameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './GameConfig';

export class ThreeGame {
  private containerId: string;
  private renderer: Renderer;
  private loop: GameLoop;
  private input: InputManager;
  
  private gameScene: GameScene;
  private camera: THREE.PerspectiveCamera;

  constructor(containerId: string) {
    this.containerId = containerId;
    
    // 1. Initialize core foundation
    this.renderer = new Renderer(containerId);
    this.input = new InputManager();
    
    // 2. Initialize scene
    this.gameScene = new GameScene();
    
    // 3. Initialize basic camera (will be moved to CameraController later)
    this.camera = new THREE.PerspectiveCamera(
      GAME_CONFIG.CAMERA.FOV,
      1, // aspect ratio updated in resize()
      GAME_CONFIG.CAMERA.NEAR,
      GAME_CONFIG.CAMERA.FAR
    );
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

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

    // Update scene logic (e.g., spinning cube)
    this.gameScene.update(dt);

    // Optional Debug overlay (e.g., exit debug command)
    if (GAME_CONFIG.DEBUG_MODE && this.input.isPressed('KeyP')) {
      console.log('Pause/Debug requested');
      this.input.keys['KeyP'] = false;
    }

    this.input.endFrame();
  }

  private render(): void {
    this.renderer.render(this.gameScene.scene, this.camera);
  }

  private onResize(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
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
