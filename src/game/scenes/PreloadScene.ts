import { ASSET_PATHS } from '../config/assetConfig';
import { GAME_TITLE } from '../../utils/constants';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    const { width, height } = this.cameras.main;

    // Loading UI
    const loadingText = this.add.text(width / 2, height / 2, `${GAME_TITLE}\nLoading...`, {
      fontFamily: 'serif',
      fontSize: '24px',
      color: '#D4AF37',
      align: 'center'
    }).setOrigin(0.5);

    // Characters
    this.load.spritesheet('Player', ASSET_PATHS.CHARACTERS.PLAYER, {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.image('BasicYokai', ASSET_PATHS.CHARACTERS.YOKAI_BASIC);
    this.load.image('ShadowYokai', ASSET_PATHS.CHARACTERS.YOKAI_SHADOW);
    this.load.image('Tengu', ASSET_PATHS.CHARACTERS.TENGU);
    
    // Boss
    this.load.image('CrimsonOni', ASSET_PATHS.BOSS.CRIMSON_ONI);
    
    // Environments
    this.load.image('EnvTemple', ASSET_PATHS.ENVIRONMENTS.TEMPLE);
    this.load.image('EnvMountains', ASSET_PATHS.ENVIRONMENTS.MOUNTAINS);
    this.load.image('EnvForest', ASSET_PATHS.ENVIRONMENTS.FOREST);
    this.load.image('EnvCourtyard', ASSET_PATHS.ENVIRONMENTS.COURTYARD);
    this.load.image('EnvCourtyardGround', ASSET_PATHS.ENVIRONMENTS.COURTYARD_GROUND);
    
    // VFX
    this.load.image('VFXSlash', ASSET_PATHS.VFX.SLASH);
    this.load.image('VFXFogAtmospheric', ASSET_PATHS.VFX.FOG_ATMOSPHERIC);
    this.load.image('VFXFogForeground', ASSET_PATHS.VFX.FOG_FOREGROUND);
    
    // Lighting
    this.load.image('LightLantern', ASSET_PATHS.LIGHTING.LANTERN);
    this.load.image('LightMoonlight', ASSET_PATHS.LIGHTING.MOONLIGHT);
    
    // Props
    this.load.image('PropForeground', ASSET_PATHS.PROPS.FOREGROUND);
    this.load.image('PropLanterns', ASSET_PATHS.PROPS.LANTERNS);
    this.load.image('PropTorii', ASSET_PATHS.PROPS.TORII);
    this.load.image('PropShrine', ASSET_PATHS.PROPS.SHRINE);
    this.load.image('PropBlacksmith', ASSET_PATHS.PROPS.BLACKSMITH);
    this.load.image('PropCampfire', ASSET_PATHS.PROPS.CAMPFIRE);

    // Audio
    this.load.audio('BGM_SilentBlade', ASSET_PATHS.AUDIO.SILENT_BLADE);
  }

  create() {
    this.scene.start('CombatScene');
  }
}
