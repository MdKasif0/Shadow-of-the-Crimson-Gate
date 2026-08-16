import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TempleScene } from './scenes/TempleScene';
import { ExpeditionScene } from './scenes/ExpeditionScene';
import { CombatScene } from './scenes/CombatScene';
import { UIScene } from './scenes/UIScene';
import { VictoryScene } from './scenes/VictoryScene';
import { GameOverScene } from './scenes/GameOverScene';

export function createPhaserGame(containerId: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_CONFIG.WIDTH,
    height: GAME_CONFIG.HEIGHT,
    parent: containerId,
    backgroundColor: GAME_CONFIG.BG_COLOR,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: GAME_CONFIG.PHYSICS.GRAVITY_Y },
        debug: GAME_CONFIG.PHYSICS.DEBUG
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
      BootScene,
      PreloadScene,
      TempleScene,
      ExpeditionScene,
      CombatScene,
      UIScene,
      VictoryScene,
      GameOverScene
    ]
  };

  return new Phaser.Game(config);
}
