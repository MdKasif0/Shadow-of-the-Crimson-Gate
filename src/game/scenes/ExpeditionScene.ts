export class ExpeditionScene extends Phaser.Scene {
  constructor() {
    super('ExpeditionScene');
  }

  create() {
    const { width, height } = this.cameras.main;

    this.cameras.main.fadeIn(1000, 0, 0, 0);

    this.add.text(width / 2, height / 2 - 50, 'THE SAKURA COURTYARD', {
      fontFamily: 'serif',
      fontSize: '32px',
      color: '#D4AF37'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, 'A place where the dead still wander.', {
      fontFamily: 'serif',
      fontSize: '18px',
      color: '#fff',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    const enterBtn = this.add.text(width / 2, height / 2 + 100, '[ ENTER ]', {
      fontSize: '20px',
      color: '#fff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    enterBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('CombatScene');
      });
    });
  }
}
