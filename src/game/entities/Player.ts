import Phaser from 'phaser';
import { PlayerState } from '../state/CombatState';
import { DEPTH, getEntityDepth } from '../config/depthConfig';
import { GAME_CONFIG } from '../config/gameConfig';

export enum FacingDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  public currentState: PlayerState = PlayerState.IDLE;
  public facing: FacingDirection = FacingDirection.DOWN;
  public health: number = 100;
  public stamina: number = 100;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'Player');
    
    // @ts-ignore
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.initPhysics();
    this.createAnimations();
    
    // Initial State
    this.setScale(1.5); // Configurable scale to fit the world
    this.setPlayerState(PlayerState.IDLE);
  }

  private initPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    // The sprite frame is 128x128. We want a smaller collision box around the feet.
    body.setSize(30, 40);
    body.setOffset(49, 88); 
    body.setCollideWorldBounds(true);
  }

  private createAnimations(): void {
    const anims = this.scene.anims;

    if (!anims.exists('player_idle')) {
      anims.create({
        key: 'player_idle',
        frames: anims.generateFrameNumbers('Player', { start: 0, end: 5 }),
        frameRate: 8,
        repeat: -1
      });

      anims.create({
        key: 'player_walk_down',
        frames: anims.generateFrameNumbers('Player', { start: 8, end: 14 }),
        frameRate: 10,
        repeat: -1
      });

      anims.create({
        key: 'player_walk_up',
        frames: anims.generateFrameNumbers('Player', { start: 16, end: 22 }),
        frameRate: 10,
        repeat: -1
      });

      anims.create({
        key: 'player_walk_side',
        frames: anims.generateFrameNumbers('Player', { start: 24, end: 30 }),
        frameRate: 10,
        repeat: -1
      });

      anims.create({
        key: 'player_attack',
        frames: anims.generateFrameNumbers('Player', { start: 32, end: 38 }),
        frameRate: 15,
        repeat: 0
      });

      anims.create({
        key: 'player_heavy_attack',
        frames: anims.generateFrameNumbers('Player', { start: 40, end: 46 }),
        frameRate: 12,
        repeat: 0
      });

      anims.create({
        key: 'player_dash',
        frames: anims.generateFrameNumbers('Player', { start: 48, end: 52 }),
        frameRate: 15,
        repeat: 0
      });

      anims.create({
        key: 'player_parry',
        frames: anims.generateFrameNumbers('Player', { start: 56, end: 61 }),
        frameRate: 12,
        repeat: 0
      });

      anims.create({
        key: 'player_hurt',
        frames: anims.generateFrameNumbers('Player', { start: 64, end: 67 }),
        frameRate: 10,
        repeat: 0
      });

      anims.create({
        key: 'player_death',
        frames: anims.generateFrameNumbers('Player', { start: 72, end: 76 }),
        frameRate: 8,
        repeat: 0
      });
    }
  }

  public updateEntity(_time: number, _delta: number): void {
    // Dynamically update depth based on Y position
    this.setDepth(getEntityDepth(this.y));

    // For this step, we just force idle animation
    if (this.currentState === PlayerState.IDLE) {
      if (this.anims.currentAnim?.key !== 'player_idle') {
        this.play('player_idle');
      }
    }
  }

  public setPlayerState(newState: PlayerState): void {
    this.currentState = newState;
  }
}
