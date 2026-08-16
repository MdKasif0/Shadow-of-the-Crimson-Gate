export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    const { width, height } = this.cameras.main;
    
    this.cameras.main.fadeIn(2000, 100, 0, 0);

    this.add.text(width / 2, height / 2 - 50, 'GAME OVER', {
      fontFamily: 'serif',
      fontSize: '64px',
      color: '#800000'
    }).setOrigin(0.5);

    const retryBtn = this.add.text(width / 2, height / 2 + 50, '[ Retry ]', {
      fontSize: '24px',
      color: '#fff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const returnBtn = this.add.text(width / 2, height / 2 + 100, '[ Return to Temple ]', {
      fontSize: '24px',
      color: '#aaa'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
      this.scene.start('CombatScene');
    });

    returnBtn.on('pointerdown', () => {
      this.scene.start('TempleScene');
    });
  }
}
