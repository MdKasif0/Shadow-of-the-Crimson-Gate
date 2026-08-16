import { PlayerState } from '../state/CombatState';

export class Player extends Phaser.GameObjects.Sprite {
  public currentState: PlayerState = PlayerState.IDLE;
  public health: number = 100;
  public stamina: number = 100;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'Player');
    // @ts-ignore
    scene.add.existing(this);
  }

  public updateEntity(_time: number, _delta: number): void {
    // Player movement and state machine updates
  }

  public setPlayerState(newState: PlayerState): void {
    this.currentState = newState;
  }
}
