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
import { LoadingScreen } from './ui/LoadingScreen';
import { AudioManager } from './audio/AudioManager';
import { StoryEvents } from './story/StoryEvent';

const ZERO = new THREE.Vector3();

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
  private loadingScreen: LoadingScreen;

  private captureHint: HTMLDivElement | null = null;
  private isInDialogue: boolean = false;
  private isIntroDone: boolean = false;
  private hasUsedMouseLook: boolean = false;
  private lastDt: number = 0;

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
    this.loadingScreen = new LoadingScreen();
    
    // 4. Bind window events
    this.onResize = this.onResize.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    // Initial size update
    this.onResize();

    // 5. Initialize Game Loop
    this.update = this.update.bind(this);
    this.render = this.render.bind(this);
    this.loop = new GameLoop(this.update, this.render);
    
    this.gameScene.initEnvironment(this.renderer.webgl);
    this.bindMouseCapture();

    // Start the game loop!
    this.loop.start();
    
    this.loadingScreen.updateProgress(100, 'Ready');
    this.loadingScreen.hide();
  }

  /**
   * Clicking the game captures the mouse so it steers the camera. Escape releases
   * it, which browsers handle themselves, so losing capture also pauses the game.
   */
  private bindMouseCapture(): void {
    const canvas = this.renderer.webgl.domElement;
    const gsm = GameStateManager.getInstance();
    let isReleasingOnPurpose = false;

    const capture = () => {
      if (document.pointerLockElement) return;
      // Browsers refuse this for a moment after Escape, and some throw rather than
      // reject. The next click tries again, and right-drag works regardless.
      try {
        Promise.resolve(canvas.requestPointerLock()).catch(() => {});
      } catch {
        // Handled by the fallback above
      }
    };
    const release = () => {
      if (!document.pointerLockElement) return;
      isReleasingOnPurpose = true;
      document.exitPointerLock();
    };

    canvas.addEventListener('mousedown', e => {
      if (e.button === 0 && gsm.getState() === GameState.PLAYING && !this.isInDialogue) capture();
    });

    document.addEventListener('pointerlockchange', () => {
      const isLocked = document.pointerLockElement !== null;
      if (!isLocked && !isReleasingOnPurpose && gsm.getState() === GameState.PLAYING) {
        this.input.keys['Escape'] = false;
        gsm.setState(GameState.PAUSED);
      }
      if (!isLocked) isReleasingOnPurpose = false;
      this.updateCaptureHint();
    });

    EventBus.on('gameStateChanged', (data: { current: GameState; previous: GameState | null }) => {
      if (data.current === GameState.PLAYING && data.previous === GameState.PAUSED) capture();
      else if (data.current !== GameState.PLAYING) release();
      this.updateCaptureHint();
    });

    EventBus.on(StoryEvents.DIALOGUE_START, () => {
      this.isInDialogue = true;
      release(); // Dialogue choices are clicked with the cursor
      this.updateCaptureHint();
    });
    EventBus.on(StoryEvents.DIALOGUE_END, () => {
      this.isInDialogue = false;
      capture();
      this.updateCaptureHint();
    });
    EventBus.on(StoryEvents.INTRO_COMPLETE, () => {
      this.isIntroDone = true;
      this.updateCaptureHint();
    });

    this.captureHint = document.createElement('div');
    this.captureHint.textContent = 'Click to control the camera  ·  Or hold right mouse and drag';
    Object.assign(this.captureHint.style, {
      position: 'fixed', bottom: '36px', left: '50%', transform: 'translateX(-50%)',
      padding: '8px 18px', fontFamily: "'Cinzel', serif", fontSize: '13px', letterSpacing: '0.08em',
      color: '#e8e2d4', background: 'rgba(8, 10, 16, 0.55)', border: '1px solid rgba(255, 255, 255, 0.14)',
      borderRadius: '2px', pointerEvents: 'none', zIndex: '90', opacity: '0', transition: 'opacity 0.4s',
    });
    document.body.appendChild(this.captureHint);
  }

  private updateCaptureHint(): void {
    if (!this.captureHint) return;
    const shouldShow = GameStateManager.getInstance().getState() === GameState.PLAYING
      && this.isIntroDone
      && !this.isInDialogue
      && !document.pointerLockElement
      && !this.hasUsedMouseLook;
    this.captureHint.style.opacity = shouldShow ? '1' : '0';
  }

  private update(dt: number): void {
    this.input.beginFrame();

    const state = GameStateManager.getInstance().getState();

    // Mouse look, except while the game is paused or in a menu
    const look = this.input.consumeLook();
    const isActive = state === GameState.PLAYING || state === GameState.BOSS;
    if (isActive && !this.isInDialogue && !this.cameraController.isSequencePlaying) {
      this.cameraController.look(look.x, look.y);
      if ((look.x !== 0 || look.y !== 0) && !this.hasUsedMouseLook) {
        this.hasUsedMouseLook = true;
        this.updateCaptureHint();
      }
    }
    this.input.cameraYaw = this.cameraController.yaw;

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


    // Describe the moment to the camera, then let it move
    const canMove = isActive && this.gameScene.player.isControlsEnabled && !this.isInDialogue;
    this.cameraController.moveDirection.copy(canMove ? this.input.getMovementDirection() : ZERO);
    this.cameraController.isSprinting = canMove && this.input.isRunPressed() && this.cameraController.moveDirection.lengthSq() > 0;
    this.cameraController.isDeathOrbit = state === GameState.GAME_OVER;
    if (this.gameScene.player.dashSystem.isDashing) this.cameraController.addDashKick();

    const isFrozen = !isActive && state !== GameState.GAME_OVER;
    this.cameraController.update(this.gameScene.player.root.position, dt, isFrozen);
    this.gameScene.updateOcclusion(isFrozen ? 0 : dt);

    this.lastDt = dt;
    this.input.endFrame();
  }

  private render(): void {
    this.renderer.render(this.gameScene.scene, this.cameraController.camera, this.lastDt);
  }

  private onResize(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.cameraController.resize(width, height);
    
    this.renderer.resize();
  }

  private onVisibilityChange(): void {
    const gsm = GameStateManager.getInstance();
    if (document.hidden) {
      if (gsm.getState() === GameState.PLAYING || gsm.getState() === GameState.BOSS) {
        gsm.setState(GameState.PAUSED);
      }
    }
  }

  public destroy(): void {
    this.loop.stop();
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.input.dispose();
    this.hud.destroy();
    this.renderer.destroy();
    AudioManager.stopAll();
  }
}

export function init3DGame(containerId: string): ThreeGame {
  return new ThreeGame(containerId);
}
