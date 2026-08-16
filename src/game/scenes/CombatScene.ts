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

    // 5. Environment Asset Positioning & Layering
    const cx = GAME_CONFIG.WORLD.WIDTH / 2;
    const cy = GAME_CONFIG.WORLD.HEIGHT / 2;

    // Background - Mountains with subtle parallax
    const mountains = this.add.image(cx, cy - 400, 'EnvMountains').setScrollFactor(0.05);
    this.backgroundLayer.add(mountains);

    // Background - Atmospheric Fog
    const bgFog = this.add.tileSprite(cx, cy, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT, 'VFXFogAtmospheric')
      .setAlpha(0.6).setScrollFactor(0.08);
    this.backgroundLayer.add(bgFog);

    // Background - Temple
    const temple = this.add.image(cx, cy - 300, 'EnvTemple').setScrollFactor(0.15);
    this.backgroundLayer.add(temple);

    // Midground - Sakura Courtyard
    const courtyard = this.add.image(cx, cy, 'EnvCourtyard').setScrollFactor(0.35);
    this.midgroundLayer.add(courtyard);

    // Ground - Playable area
    const ground = this.add.image(cx, cy + 200, 'EnvCourtyardGround').setScrollFactor(1.0);
    this.groundLayer.add(ground);

    // Foreground Props
    const torii = this.add.image(cx, cy - 100, 'PropTorii').setScrollFactor(0.60);
    this.foregroundLayer.add(torii);
    
    const shrine = this.add.image(cx - 400, cy - 200, 'PropShrine').setScrollFactor(0.60);
    this.foregroundLayer.add(shrine);
    
    const lanterns = this.add.image(cx + 400, cy - 100, 'PropLanterns').setScrollFactor(0.60);
    this.foregroundLayer.add(lanterns);

    const foregroundProps = this.add.image(cx, cy + 400, 'PropForeground').setScrollFactor(0.60);
    this.foregroundLayer.add(foregroundProps);

    // Foreground Mist
    const fgMist = this.add.tileSprite(cx, cy, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT, 'VFXFogForeground')
      .setAlpha(0.3).setScrollFactor(0.60);
    this.foregroundLayer.add(fgMist);

    // Lighting
    const moonlight = this.add.image(cx, cy, 'LightMoonlight').setAlpha(0.4).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);
    this.lightingLayer.add(moonlight);
    
    const lanternGlow = this.add.image(cx + 400, cy - 100, 'LightLantern').setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.lightingLayer.add(lanternGlow);

    // Fog Animation
    this.tweens.add({
      targets: [bgFog, fgMist],
      tilePositionX: '+=1000',
      duration: 50000,
      repeat: -1
    });

    // VFX Particles
    this.vfxSystem.spawnSakuraPetals();
    this.vfxSystem.spawnSpirits();

    // 6. Initialize Groups
    this.enemies = this.add.group({
      runChildUpdate: true
    });

    // Launch HUD
    this.scene.launch('UIScene');

    // 7. Spawn Player
    this.player = new Player(this, GAME_CONFIG.PLAYER.START_X, GAME_CONFIG.PLAYER.START_Y);
    this.entityLayer.add(this.player);

    // 8. Camera Follow Player
    this.cameraSystem.follow(this.player);

    // 9. Development Debug Mode
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

  update(time: number, delta: number) {
    this.bossSystem.update();

    if (this.player) {
      this.player.updateEntity(time, delta);
    }

    if (GAME_CONFIG.DEBUG_MODE && this.debugText) {
      this.debugText.setText([
        `FPS: ${Math.round(this.game.loop.actualFps)}`,
        `Scene: CombatScene`,
        `Camera: (${Math.round(this.cameras.main.scrollX)}, ${Math.round(this.cameras.main.scrollY)})`,
        `World Size: ${GAME_CONFIG.WORLD.WIDTH}x${GAME_CONFIG.WORLD.HEIGHT}`,
        `Player Pos: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`,
        `Player State: ${this.player.currentState}`,
        `Player Facing: ${this.player.facing}`,
        `Player Depth: ${this.player.depth}`
      ]);
    }
  }

  private cleanup() {
    this.input.keyboard?.removeAllListeners();
    // Destroy timers or events if any are running
  }
}
