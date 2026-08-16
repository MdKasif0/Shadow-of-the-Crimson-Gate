export class TempleScene extends Phaser.Scene {
  constructor() {
    super('TempleScene');
  }

  create() {
    const { width, height } = this.cameras.main;
    
    // Placeholder Background
    this.add.image(width / 2, height / 2, 'EnvTemple').setOrigin(0.5);
    
    const title = this.add.text(width / 2, height / 4, 'TEMPLE HUB', {
      fontSize: '48px',
      color: '#fff'
    }).setOrigin(0.5);

    const startBtn = this.add.text(width / 2, height / 2, '[ Enter Crimson Gate ]', {
      fontSize: '24px',
      color: '#D4AF37'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => {
      this.scene.start('ExpeditionScene');
    });
  }
}
