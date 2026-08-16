export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load minimal assets needed for PreloadScene (e.g. loading bar graphic) if needed
  }

  create() {
    this.scale.scaleMode = Phaser.Scale.FIT;
    this.scale.autoCenter = Phaser.Scale.CENTER_BOTH;
    
    // Move to preload scene
    this.scene.start('PreloadScene');
  }
}
