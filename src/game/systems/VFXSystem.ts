import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { DEPTH } from '../config/depthConfig';

export class VFXSystem {
  private scene: Phaser.Scene;
  private petalsGroup!: Phaser.GameObjects.Group;
  private spiritsGroup!: Phaser.GameObjects.Group;
  
  private petalTimer?: Phaser.Time.TimerEvent;
  private spiritTimer?: Phaser.Time.TimerEvent;

  public ambientPetalsEnabled: boolean = false;
  public ambientSpiritsEnabled: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public init(): void {
    this.generateTextures();

    this.petalsGroup = this.scene.add.group({
      classType: Phaser.GameObjects.Sprite,
      maxSize: GAME_CONFIG.VFX.MAX_PETALS[GAME_CONFIG.VFX.QUALITY_LEVEL as keyof typeof GAME_CONFIG.VFX.MAX_PETALS] || 25,
      runChildUpdate: false
    });

    this.spiritsGroup = this.scene.add.group({
      classType: Phaser.GameObjects.Sprite,
      maxSize: GAME_CONFIG.VFX.MAX_SPIRITS[GAME_CONFIG.VFX.QUALITY_LEVEL as keyof typeof GAME_CONFIG.VFX.MAX_SPIRITS] || 12,
      runChildUpdate: false
    });
  }

  private generateTextures(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);

    // Petal A: Soft Pink
    g.clear();
    g.fillStyle(0xFFB7C5, 0.7);
    g.fillEllipse(5, 5, 6, 10);
    g.generateTexture('proc_petal_a', 10, 10);

    // Petal B: Slightly Darker Pink
    g.clear();
    g.fillStyle(0xFF9EAF, 0.75);
    g.fillEllipse(6, 6, 8, 12);
    g.generateTexture('proc_petal_b', 12, 12);

    // Petal C: Tiny Ivory
    g.clear();
    g.fillStyle(0xFFF0F5, 0.6);
    g.fillEllipse(4, 4, 4, 8);
    g.generateTexture('proc_petal_c', 8, 8);

    // Spirit Particle: Cyan Glow
    g.clear();
    g.fillStyle(0x63D9D0, 0.1);
    g.fillCircle(10, 10, 10);
    g.fillStyle(0x63D9D0, 0.3);
    g.fillCircle(10, 10, 6);
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillCircle(10, 10, 2);
    g.generateTexture('proc_spirit', 20, 20);

    g.destroy();
  }

  public startAmbientPetals(): void {
    this.ambientPetalsEnabled = true;
    if (this.petalTimer) this.petalTimer.remove();

    this.petalTimer = this.scene.time.addEvent({
      delay: GAME_CONFIG.VFX.WIND.PETAL_SPAWN_RATE,
      callback: () => {
        if (this.ambientPetalsEnabled) {
          // Burst of 1-3 petals
          const count = Phaser.Math.Between(1, 3);
          for (let i = 0; i < count; i++) {
            this.spawnPetal();
          }
        }
      },
      loop: true
    });
  }

  public stopAmbientPetals(): void {
    this.ambientPetalsEnabled = false;
  }

  public startAmbientSpirits(): void {
    this.ambientSpiritsEnabled = true;
    if (this.spiritTimer) this.spiritTimer.remove();

    this.spiritTimer = this.scene.time.addEvent({
      delay: 3000,
      callback: () => {
        if (this.ambientSpiritsEnabled) {
          this.spawnSpirit();
        }
      },
      loop: true
    });
  }

  public stopAmbientSpirits(): void {
    this.ambientSpiritsEnabled = false;
  }

  private spawnPetal(): void {
    const petal = this.petalsGroup.get() as Phaser.GameObjects.Sprite;
    if (!petal) return;

    const textures = ['proc_petal_a', 'proc_petal_b', 'proc_petal_c'];
    petal.setTexture(Phaser.Utils.Array.GetRandom(textures));

    const cam = this.scene.cameras.main;
    // Spawn from top or left outside camera bounds slightly
    const startX = cam.worldView.x - 100 + Math.random() * cam.worldView.width;
    const startY = cam.worldView.y - 100 + (Math.random() < 0.2 ? Math.random() * cam.worldView.height : 0);

    petal.setPosition(startX, startY);
    petal.setActive(true).setVisible(true);

    // Depth and Size grouping
    const depthRoll = Math.random();
    let pScale = 1;
    let pAlpha = 1;
    if (depthRoll < 0.3) {
      // Background
      pScale = Phaser.Math.FloatBetween(0.3, 0.6);
      pAlpha = Phaser.Math.FloatBetween(0.2, 0.4);
      petal.setDepth(DEPTH.BACKGROUND);
    } else if (depthRoll < 0.8) {
      // Midground
      pScale = Phaser.Math.FloatBetween(0.5, 0.9);
      pAlpha = Phaser.Math.FloatBetween(0.35, 0.6);
      petal.setDepth(DEPTH.PARTICLES);
    } else {
      // Foreground
      pScale = Phaser.Math.FloatBetween(0.8, 1.4);
      pAlpha = Phaser.Math.FloatBetween(0.45, 0.75);
      petal.setDepth(DEPTH.FOREGROUND_FOG + 10);
    }

    petal.setScale(pScale);
    petal.setAlpha(pAlpha);

    // Custom properties stored in data for update loop
    petal.setData('windX', GAME_CONFIG.VFX.WIND.PETAL_WIND_SPEED * Phaser.Math.FloatBetween(0.8, 1.2) * pScale);
    petal.setData('windY', GAME_CONFIG.VFX.WIND.PETAL_FALL_SPEED * Phaser.Math.FloatBetween(0.8, 1.2) * pScale);
    petal.setData('rotSpeed', Phaser.Math.FloatBetween(-0.05, 0.05));
    petal.setData('swayAmount', GAME_CONFIG.VFX.WIND.PETAL_SWAY_AMOUNT * Phaser.Math.FloatBetween(0.5, 1.5));
    petal.setData('swayFreq', GAME_CONFIG.VFX.WIND.PETAL_SWAY_FREQUENCY * Phaser.Math.FloatBetween(0.8, 1.2));
    petal.setData('spawnTime', this.scene.time.now);
    petal.setData('lifetime', Phaser.Math.Between(4000, 8000));
    petal.setData('baseX', petal.x);
  }

  private spawnSpirit(): void {
    const spirit = this.spiritsGroup.get() as Phaser.GameObjects.Sprite;
    if (!spirit) return;

    spirit.setTexture('proc_spirit');

    const cam = this.scene.cameras.main;
    // Prefer to spawn in shrine/lantern areas (approx middle of map)
    const centerX = GAME_CONFIG.WORLD.WIDTH / 2;
    const centerY = GAME_CONFIG.WORLD.HEIGHT / 2;
    
    // Spawn within active view, weighted towards center
    const sx = Phaser.Math.Clamp(centerX + Phaser.Math.Between(-800, 800), cam.worldView.left, cam.worldView.right);
    const sy = Phaser.Math.Clamp(centerY + Phaser.Math.Between(-400, 400), cam.worldView.top, cam.worldView.bottom);

    spirit.setPosition(sx, sy);
    spirit.setActive(true).setVisible(true);

    const sScale = Phaser.Math.FloatBetween(0.1, 0.4);
    spirit.setScale(sScale);
    spirit.setAlpha(0);
    spirit.setDepth(DEPTH.PARTICLES);

    spirit.setData('riseSpeed', Phaser.Math.FloatBetween(0.1, 0.3));
    spirit.setData('drift', Phaser.Math.FloatBetween(0.2, 0.5));
    spirit.setData('freq', Phaser.Math.FloatBetween(0.001, 0.003));
    spirit.setData('baseScale', sScale);
    spirit.setData('pulseSpeed', Phaser.Math.FloatBetween(0.002, 0.005));
    spirit.setData('spawnTime', this.scene.time.now);
    spirit.setData('lifetime', Phaser.Math.Between(5000, 10000));
    spirit.setData('baseX', sx);
  }

  public update(time: number, _delta: number): void {
    // Update Petals
    this.petalsGroup.getChildren().forEach((child) => {
      const petal = child as Phaser.GameObjects.Sprite;
      if (!petal.active) return;

      const age = time - petal.getData('spawnTime');
      const lifetime = petal.getData('lifetime');

      if (age > lifetime) {
        this.petalsGroup.killAndHide(petal);
        return;
      }

      // Wind and Sway
      const baseX = petal.getData('baseX') + petal.getData('windX') * _delta;
      petal.setData('baseX', baseX);
      
      petal.x = baseX + Math.sin(time * petal.getData('swayFreq')) * petal.getData('swayAmount');
      petal.y += petal.getData('windY') * _delta;
      petal.rotation += petal.getData('rotSpeed');
    });

    // Update Spirits
    this.spiritsGroup.getChildren().forEach((child) => {
      const spirit = child as Phaser.GameObjects.Sprite;
      if (!spirit.active) return;

      const age = time - spirit.getData('spawnTime');
      const lifetime = spirit.getData('lifetime');

      if (age > lifetime) {
        this.spiritsGroup.killAndHide(spirit);
        return;
      }

      // Drift and Rise
      const baseX = spirit.getData('baseX');
      spirit.x = baseX + Math.sin(time * spirit.getData('freq')) * spirit.getData('drift') * 50;
      spirit.y -= spirit.getData('riseSpeed') * _delta;

      // Pulse Alpha and Scale
      const progress = age / lifetime;
      // Fade in and out
      const alphaT = Math.sin(progress * Math.PI); 
      spirit.setAlpha(alphaT * (0.3 + Math.sin(time * spirit.getData('pulseSpeed')) * 0.2));
      spirit.setScale(spirit.getData('baseScale') + Math.sin(time * spirit.getData('pulseSpeed')) * 0.1);
    });
  }
}
