export class CameraSystem {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  public followPlayer(player: Phaser.GameObjects.Sprite): void {
    // Implement smooth interpolation and deadzones later
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
