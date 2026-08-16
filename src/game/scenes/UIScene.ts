export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    // UI elements use a fixed camera natively because this is a separate scene
    this.add.text(20, 20, 'HP: 100/100', {
      fontSize: '20px',
      color: '#f00'
    });

    this.add.text(20, 50, 'STM: 100/100', {
      fontSize: '20px',
      color: '#0f0'
    });
  }
}
