export class AudioSystem {
  private scene: Phaser.Scene;
  private bgm: Phaser.Sound.BaseSound | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public playMusic(key: string, loop: boolean = true): void {
    // To be implemented
  }

  public fadeMusicOut(duration: number = 1000): void {
    // To be implemented
  }

  public playSFX(key: string, volume: number = 1.0): void {
    // To be implemented
  }

  public mute(): void {
    this.scene.sound.mute = true;
  }

  public unmute(): void {
    this.scene.sound.mute = false;
  }
}
