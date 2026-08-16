import { CameraSystem } from '../systems/CameraSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { BossSystem } from '../systems/BossSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { VFXSystem } from '../systems/VFXSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';

export class CombatScene extends Phaser.Scene {
  public cameraSystem!: CameraSystem;
  public waveSystem!: WaveSystem;
  public bossSystem!: BossSystem;
  public combatSystem!: CombatSystem;
  public vfxSystem!: VFXSystem;
  public audioSystem!: AudioSystem;

  public player!: Player;
  public enemies: Phaser.GameObjects.Group;

  constructor() {
    super('CombatScene');
    this.enemies = null as any; // Initialized in create
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.fadeIn(1000, 0, 0, 0);
    
    // Init Systems
    this.cameraSystem = new CameraSystem(this);
    this.waveSystem = new WaveSystem();
    this.bossSystem = new BossSystem(this);
    this.combatSystem = new CombatSystem();
    this.vfxSystem = new VFXSystem(this);
    this.audioSystem = new AudioSystem(this);

    // Init Scene Data
    this.enemies = this.add.group();
    
    // Environment Placeholder
    this.add.image(width / 2, height / 2, 'EnvCourtyard').setOrigin(0.5).setDepth(30);
    this.add.image(width / 2, height / 2, 'EnvCourtyardGround').setOrigin(0.5).setDepth(50);
    
    // Launch UI
    this.scene.launch('UIScene');

    // Debug Exit
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene');
    });
  }

  update(time: number, delta: number) {
    // Delegate updates to systems
    this.bossSystem.update();
  }
}
