export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create() {
    const { width, height } = this.cameras.main;
    
    this.add.text(width / 2, height / 2, 'VICTORY', {
      fontSize: '64px',
      color: '#D4AF37'
    }).setOrigin(0.5);

    const returnBtn = this.add.text(width / 2, height / 2 + 100, '[ Return to Temple ]', {
      fontSize: '24px',
      color: '#fff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    returnBtn.on('pointerdown', () => {
      this.scene.start('TempleScene');
    });
  }
}
