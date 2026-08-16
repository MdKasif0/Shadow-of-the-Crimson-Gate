import { CameraSystem } from '../systems/CameraSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { BossSystem } from '../systems/BossSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { VFXSystem } from '../systems/VFXSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { Player } from '../entities/Player';
import { GAME_CONFIG } from '../config/gameConfig';
import { DEPTH } from '../config/depthConfig';

export class CombatScene extends Phaser.Scene {
  // Systems
  public cameraSystem!: CameraSystem;
  public waveSystem!: WaveSystem;
  public bossSystem!: BossSystem;
  public combatSystem!: CombatSystem;
  public vfxSystem!: VFXSystem;
  public audioSystem!: AudioSystem;

  // Entities
  public player!: Player;
  public enemies!: Phaser.GameObjects.Group;

  // Display Layers
  public backgroundLayer!: Phaser.GameObjects.Layer;
  public midgroundLayer!: Phaser.GameObjects.Layer;
  public groundLayer!: Phaser.GameObjects.Layer;
  public entityLayer!: Phaser.GameObjects.Layer;
  public foregroundLayer!: Phaser.GameObjects.Layer;
  public vfxLayer!: Phaser.GameObjects.Layer;
  public lightingLayer!: Phaser.GameObjects.Layer;

  // Debug
  private debugText!: Phaser.GameObjects.Text;

  constructor() {
    super('CombatScene');
  }

  init() {
    // 1. World Bounds Configuration
    const worldWidth = GAME_CONFIG.WORLD.WIDTH;
    const worldHeight = GAME_CONFIG.WORLD.HEIGHT;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
  }

  create() {
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // 2. Initialize Systems
    this.cameraSystem = new CameraSystem(this);
    this.waveSystem = new WaveSystem();
    this.bossSystem = new BossSystem(this);
    this.combatSystem = new CombatSystem();
    this.vfxSystem = new VFXSystem(this);
    this.audioSystem = new AudioSystem(this);

    // 3. Initialize Camera
    this.cameraSystem.setBounds(GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT);

    // 4. Create Display Layers based on Depth Architecture
    this.backgroundLayer = this.add.layer().setDepth(DEPTH.BACKGROUND);
    this.midgroundLayer = this.add.layer().setDepth(DEPTH.MIDGROUND);
    this.groundLayer = this.add.layer().setDepth(DEPTH.GROUND);
    this.entityLayer = this.add.layer().setDepth(DEPTH.ENTITY_BASE);
    this.foregroundLayer = this.add.layer().setDepth(DEPTH.FOREGROUND_PROPS);
    this.vfxLayer = this.add.layer().setDepth(DEPTH.PARTICLES);
    this.lightingLayer = this.add.layer().setDepth(DEPTH.LIGHTING);

    // 5. Initialize Groups
    this.enemies = this.add.group({
      runChildUpdate: true
    });

    // Launch HUD
    this.scene.launch('UIScene');

    // 6. Development Debug Mode
    if (GAME_CONFIG.DEBUG_MODE) {
      this.debugText = this.add.text(10, 10, '', {
        fontSize: '16px',
        color: '#00ff00',
        backgroundColor: '#00000088',
        padding: { x: 5, y: 5 }
      }).setScrollFactor(0).setDepth(DEPTH.HUD + 1);
    }

    // Keybindings
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene');
    });

    // 7. Proper Cleanup
    this.events.once('shutdown', this.cleanup, this);
  }

  update(_time: number, _delta: number) {
    this.bossSystem.update();

    if (GAME_CONFIG.DEBUG_MODE && this.debugText) {
      this.debugText.setText([
        `FPS: ${Math.round(this.game.loop.actualFps)}`,
        `Scene: CombatScene`,
        `Camera: (${Math.round(this.cameras.main.scrollX)}, ${Math.round(this.cameras.main.scrollY)})`,
        `World Size: ${GAME_CONFIG.WORLD.WIDTH}x${GAME_CONFIG.WORLD.HEIGHT}`
      ]);
    }
  }

  private cleanup() {
    this.input.keyboard?.removeAllListeners();
    // Destroy timers or events if any are running
  }
}
