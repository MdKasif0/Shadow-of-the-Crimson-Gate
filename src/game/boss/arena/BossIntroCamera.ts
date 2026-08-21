import * as THREE from 'three';
import { CameraController } from '../../camera/CameraController';
import { GAME_CONFIG } from '../../GameConfig';

export enum IntroState {
  INACTIVE,
  PAN_TO_BOSS,
  ZOOM_AND_HOLD,
  RETURN_TO_PLAYER,
  COMPLETE
}

/**
 * BossIntroCamera — Manages the cinematic sequence when entering the boss arena.
 */
export class BossIntroCamera {
  private cameraController: CameraController;
  private state: IntroState = IntroState.INACTIVE;
  
  private bossPos: THREE.Vector3 = new THREE.Vector3();
  private playerPos: THREE.Vector3 = new THREE.Vector3();
  private currentTarget: THREE.Vector3 = new THREE.Vector3();
  
  private timer: number = 0;
  
  // Timing config (seconds)
  private readonly PAN_DURATION = 1.5;
  private readonly HOLD_DURATION = 3.0;
  private readonly RETURN_DURATION = 1.0;

  constructor(cameraController: CameraController) {
    this.cameraController = cameraController;
  }

  public get isActive(): boolean {
    return this.state !== IntroState.INACTIVE && this.state !== IntroState.COMPLETE;
  }

  public get isHolding(): boolean {
    return this.state === IntroState.ZOOM_AND_HOLD;
  }

  public start(bossPos: THREE.Vector3, playerPos: THREE.Vector3): void {
    this.state = IntroState.PAN_TO_BOSS;
    this.bossPos.copy(bossPos);
    this.playerPos.copy(playerPos);
    this.currentTarget.copy(playerPos);
    this.timer = 0;
    
    this.cameraController.overrideTarget = this.currentTarget;
  }

  public update(dt: number, playerPos: THREE.Vector3, bossPos: THREE.Vector3): void {
    if (!this.isActive) return;

    this.timer += dt;
    this.playerPos.copy(playerPos);
    this.bossPos.copy(bossPos);

    if (this.state === IntroState.PAN_TO_BOSS) {
      const t = Math.min(this.timer / this.PAN_DURATION, 1.0);
      const ease = this.easeInOutQuad(t);
      
      // Pan from player to boss, slightly offset to frame the boss
      const targetPos = this.bossPos.clone().add(new THREE.Vector3(0, 0, 4));
      this.currentTarget.lerpVectors(this.playerPos, targetPos, ease);
      this.cameraController.overrideTarget = this.currentTarget;
      
      // Zoom in slightly (scale > 1 means zoomed in)
      this.cameraController.overrideZoom = 1.3;

      if (t >= 1.0) {
        this.state = IntroState.ZOOM_AND_HOLD;
        this.timer = 0;
      }
    } 
    else if (this.state === IntroState.ZOOM_AND_HOLD) {
      // Hold on boss, very slow zoom
      const t = Math.min(this.timer / this.HOLD_DURATION, 1.0);
      this.cameraController.overrideZoom = 1.3 + (t * 0.2);
      
      const targetPos = this.bossPos.clone().add(new THREE.Vector3(0, 0, 4));
      this.cameraController.overrideTarget = targetPos;

      if (t >= 1.0) {
        this.state = IntroState.RETURN_TO_PLAYER;
        this.timer = 0;
      }
    }
    else if (this.state === IntroState.RETURN_TO_PLAYER) {
      const t = Math.min(this.timer / this.RETURN_DURATION, 1.0);
      const ease = this.easeInOutQuad(t);
      
      // Interpolate back to player
      const startPos = this.bossPos.clone().add(new THREE.Vector3(0, 0, 4));
      this.currentTarget.lerpVectors(startPos, this.playerPos, ease);
      this.cameraController.overrideTarget = this.currentTarget;
      
      // Restore zoom
      const startZoom = 1.5;
      this.cameraController.overrideZoom = startZoom + (1.0 - startZoom) * ease;

      if (t >= 1.0) {
        this.state = IntroState.COMPLETE;
        this.cameraController.overrideTarget = null;
        this.cameraController.overrideZoom = null;
      }
    }
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}
