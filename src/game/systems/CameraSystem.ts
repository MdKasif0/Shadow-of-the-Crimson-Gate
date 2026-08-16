import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class CameraSystem {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  public setBounds(width: number, height: number): void {
    this.camera.setBounds(0, 0, width, height);
  }

  public follow(target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container): void {
    // Smooth follow logic with lerp and deadzone
    this.camera.startFollow(target, true, GAME_CONFIG.CAMERA.LERP, GAME_CONFIG.CAMERA.LERP);
    if (GAME_CONFIG.CAMERA.DEADZONE_WIDTH > 0 && GAME_CONFIG.CAMERA.DEADZONE_HEIGHT > 0) {
      this.camera.setDeadzone(GAME_CONFIG.CAMERA.DEADZONE_WIDTH, GAME_CONFIG.CAMERA.DEADZONE_HEIGHT);
    }
  }

  public followPlayer(player: Phaser.GameObjects.Sprite): void {
    this.follow(player);
  }

  public shakeLight(): void {
    this.camera.shake(100, 0.005);
  }

  public shakeMedium(): void {
    this.camera.shake(200, 0.015);
  }

  public shakeHeavy(): void {
    this.camera.shake(300, 0.03);
  }

  public cinematicZoom(targetZoom: number, duration: number = 1000): void {
    this.camera.zoomTo(targetZoom, duration, 'Sine.easeInOut');
  }

  public resetZoom(duration: number = 1000): void {
    this.camera.zoomTo(1.0, duration, 'Sine.easeInOut');
  }
}
