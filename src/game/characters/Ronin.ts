import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';
import { CharacterAnimator, AnimState } from './CharacterAnimator';
import { CharacterFactory } from './CharacterFactory';

export class Ronin {
  public root: THREE.Group;
  private rig: CharacterRig;
  private animator: CharacterAnimator;

  constructor() {
    // 1. Generate procedural rig and mesh
    this.rig = CharacterFactory.createRonin();
    
    // 2. Setup Animation
    this.animator = new CharacterAnimator(this.rig);
    
    // 3. Encapsulate
    this.root = new THREE.Group();
    this.root.name = 'PlayerRonin';
    this.root.add(this.rig.root);
  }

  public update(dt: number): void {
    // Update internal animation
    this.animator.update(dt);
  }

  public playIdle(): void {
    this.animator.setState(AnimState.IDLE);
  }

  public playWalk(): void {
    this.animator.setState(AnimState.WALK);
  }

  // Position control
  public setPosition(x: number, y: number, z: number): void {
    this.root.position.set(x, y, z);
  }

  // Rotation control
  public setRotation(y: number): void {
    this.root.rotation.y = y;
  }
}
