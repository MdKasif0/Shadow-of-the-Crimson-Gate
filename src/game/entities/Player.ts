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

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: any;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'Player');
    
    // @ts-ignore
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.initPhysics();
    this.createAnimations();
    this.initInput();
    
    // Initial State
    this.setScale(1.5);
    this.setPlayerState(PlayerState.IDLE);
  }

  private initPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(30, 40);
    body.setOffset(49, 88); 
    body.setCollideWorldBounds(true);
  }

  private initInput(): void {
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
      this.wasdKeys = this.scene.input.keyboard.addKeys('W,A,S,D,R');
    }
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
    // Dynamic Depth Update
    this.setDepth(getEntityDepth(this.y));

    // Input Handling
    this.handleMovement();

    // Development Mode Reset
    if (GAME_CONFIG.DEBUG_MODE && this.wasdKeys?.R.isDown) {
      this.setPosition(GAME_CONFIG.PLAYER.START_X, GAME_CONFIG.PLAYER.START_Y);
    }
  }

  private handleMovement(): void {
    if (this.currentState !== PlayerState.IDLE && this.currentState !== PlayerState.WALK) {
      return; // Cannot move if attacking, dashing, etc.
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = GAME_CONFIG.PLAYER.MOVE_SPEED;

    let moveX = 0;
    let moveY = 0;

    // Evaluate Input
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) moveX = -1;
    else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) moveX = 1;

    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) moveY = -1;
    else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) moveY = 1;

    // Apply Velocity (Normalized for diagonals)
    if (moveX !== 0 || moveY !== 0) {
      const length = Math.sqrt(moveX * moveX + moveY * moveY);
      body.setVelocity((moveX / length) * speed, (moveY / length) * speed);
      
      this.setPlayerState(PlayerState.WALK);
      this.updateFacingDirection(moveX, moveY);
      this.playWalkAnimation();
    } else {
      body.setVelocity(0, 0);
      this.setPlayerState(PlayerState.IDLE);
      this.playIdleAnimation();
    }
  }

  private updateFacingDirection(moveX: number, moveY: number): void {
    if (moveX < 0) this.facing = FacingDirection.LEFT;
    else if (moveX > 0) this.facing = FacingDirection.RIGHT;
    else if (moveY < 0) this.facing = FacingDirection.UP;
    else if (moveY > 0) this.facing = FacingDirection.DOWN;
  }

  private playWalkAnimation(): void {
    let animKey = 'player_walk_down';
    
    switch (this.facing) {
      case FacingDirection.UP:
        animKey = 'player_walk_up';
        this.setFlipX(false);
        break;
      case FacingDirection.DOWN:
        animKey = 'player_walk_down';
        this.setFlipX(false);
        break;
      case FacingDirection.LEFT:
        animKey = 'player_walk_side';
        this.setFlipX(true); // Flip for left
        break;
      case FacingDirection.RIGHT:
        animKey = 'player_walk_side';
        this.setFlipX(false);
        break;
    }

    if (this.anims.currentAnim?.key !== animKey) {
      this.play(animKey);
    }
  }

  private playIdleAnimation(): void {
    // The sprite sheet only has one idle animation. We will reuse it for all directions.
    // However, we maintain the horizontal flip based on the last left/right facing direction.
    if (this.facing === FacingDirection.LEFT) {
      this.setFlipX(true);
    } else if (this.facing === FacingDirection.RIGHT) {
      this.setFlipX(false);
    }

    if (this.anims.currentAnim?.key !== 'player_idle') {
      this.play('player_idle');
    }
  }

  public setPlayerState(newState: PlayerState): void {
    this.currentState = newState;
  }
}
