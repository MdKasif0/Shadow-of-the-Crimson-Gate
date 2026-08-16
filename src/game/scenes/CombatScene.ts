import Phaser from 'phaser';
import { CameraSystem } from '../systems/CameraSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { BossSystem } from '../systems/BossSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { VFXSystem } from '../systems/VFXSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { Player } from '../entities/Player';
import { GAME_CONFIG } from '../config/gameConfig';
import { DEPTH } from '../config/depthConfig';
import { ENV_CONFIG } from '../config/environmentConfig';

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
    const bgScale = ENV_CONFIG.SCALE.BASE_BG;
    const propScale = ENV_CONFIG.SCALE.PROPS;

    // Background - Mountains with subtle parallax
    const mountains = this.add.image(cx, cy - 800, 'EnvMountains')
      .setScale(bgScale)
      .setScrollFactor(ENV_CONFIG.PARALLAX.MOUNTAINS);
    this.backgroundLayer.add(mountains);

    // Background - Atmospheric Fog
    const bgFog = this.add.tileSprite(cx, cy, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT, 'VFXFogAtmospheric')
      .setAlpha(0.6)
      .setScrollFactor(ENV_CONFIG.PARALLAX.DISTANT_FOG);
    this.backgroundLayer.add(bgFog);

    // Background - Temple
    // Shifted slightly up so the ground seamlessly blends at the base
    const temple = this.add.image(cx, cy - 400, 'EnvTemple')
      .setScale(bgScale)
      .setScrollFactor(ENV_CONFIG.PARALLAX.TEMPLE);
    this.backgroundLayer.add(temple);

    // Midground - Sakura Courtyard
    const courtyard = this.add.image(cx, cy - 100, 'EnvCourtyard')
      .setScale(bgScale)
      .setScrollFactor(ENV_CONFIG.PARALLAX.MIDGROUND);
    this.midgroundLayer.add(courtyard);

    // Ground - Playable area anchored securely at 1.0 scroll factor
    const ground = this.add.image(cx, cy + 300, 'EnvCourtyardGround')
      .setScale(bgScale)
      .setScrollFactor(1.0);
    this.groundLayer.add(ground);

    // Foreground Props - Framing the edges of the playable arena
    const torii = this.add.image(cx - 1400, cy, 'PropTorii')
      .setScale(propScale)
      .setScrollFactor(ENV_CONFIG.PARALLAX.FOREGROUND);
    this.foregroundLayer.add(torii);
    
    const shrine = this.add.image(cx + 1200, cy + 100, 'PropShrine')
      .setScale(propScale)
      .setScrollFactor(ENV_CONFIG.PARALLAX.FOREGROUND);
    this.foregroundLayer.add(shrine);
    
    const lanterns = this.add.image(cx - 1200, cy + 500, 'PropLanterns')
      .setScale(propScale)
      .setScrollFactor(ENV_CONFIG.PARALLAX.FOREGROUND);
    this.foregroundLayer.add(lanterns);

    const foregroundProps = this.add.image(cx + 1000, cy + 700, 'PropForeground')
      .setScale(propScale)
      .setScrollFactor(ENV_CONFIG.PARALLAX.FOREGROUND);
    this.foregroundLayer.add(foregroundProps);

    // Foreground Mist
    const fgMist = this.add.tileSprite(cx, cy + 500, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT / 2, 'VFXFogForeground')
      .setAlpha(0.3)
      .setScrollFactor(ENV_CONFIG.PARALLAX.FOREGROUND);
    this.foregroundLayer.add(fgMist);

    // Lighting
    const moonlight = this.add.image(cx, cy, 'LightMoonlight')
      .setScale(bgScale)
      .setAlpha(0.3)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.lightingLayer.add(moonlight);
    
    const lanternGlow = this.add.image(cx + 1200, cy + 100, 'LightLantern')
      .setScale(propScale)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.lightingLayer.add(lanternGlow);

    // Fog Animation
    this.tweens.add({
      targets: [bgFog, fgMist],
      tilePositionX: '+=1000',
      duration: 50000,
      repeat: -1
    });

    // VFX Particles
    this.vfxSystem.init();
    this.vfxSystem.startAmbientPetals();
    this.vfxSystem.startAmbientSpirits();

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
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 10, y: 10 }
      }).setScrollFactor(0).setDepth(DEPTH.HUD);

      // VFX Toggles
      if (this.input.keyboard) {
        this.input.keyboard.on('keydown-P', () => {
          this.vfxSystem.ambientPetalsEnabled ? this.vfxSystem.stopAmbientPetals() : this.vfxSystem.startAmbientPetals();
        });
        this.input.keyboard.on('keydown-O', () => {
          this.vfxSystem.ambientSpiritsEnabled ? this.vfxSystem.stopAmbientSpirits() : this.vfxSystem.startAmbientSpirits();
        });
      }

      // Visual Bounds Debugging
      const debugGraphics = this.add.graphics().setDepth(DEPTH.HUD);
      
      // World Bounds (Red)
      debugGraphics.lineStyle(4, 0xff0000, 1);
      debugGraphics.strokeRect(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT);

      // Ground Bounds (Green)
      debugGraphics.lineStyle(4, 0x00ff00, 1);
      debugGraphics.strokeRect(
        ground.x - (ground.width * bgScale) / 2, 
        ground.y - (ground.height * bgScale) / 2, 
        ground.width * bgScale, 
        ground.height * bgScale
      );
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
    this.vfxSystem.update(time, delta);

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
