import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';
import { CollisionSystem } from '../physics/CollisionSystem';

export class PlayerMovement {
  private direction = new THREE.Vector3();
  private keys: { [key: string]: boolean } = {};
  private playerRoot: THREE.Group;
  private collisionSystem: CollisionSystem;
  private _isMoving: boolean = false;
  
  constructor(playerRoot: THREE.Group, collisionSystem: CollisionSystem) {
    this.playerRoot = playerRoot;
    this.collisionSystem = collisionSystem;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.keys[event.code] = true;
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keys[event.code] = false;
  }

  private handleBlur(): void {
    this.keys = {}; // Reset all inputs when window loses focus
  }

  public isMoving(): boolean {
    return this._isMoving;
  }

  public update(deltaTime: number): void {
    this.direction.set(0, 0, 0);

    if (this.keys['KeyW'] || this.keys['ArrowUp']) this.direction.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) this.direction.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.direction.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.direction.x += 1;

    // Normalize for diagonal movement
    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();
      this._isMoving = true;

      // Calculate intended new position
      const speed = GAME_CONFIG.PLAYER?.SPEED || 6.0;
      const rotationSpeed = GAME_CONFIG.PLAYER?.ROTATION_SPEED || 10.0;

      const velocity = this.direction.clone().multiplyScalar(speed * deltaTime);
      const targetPosition = this.playerRoot.position.clone().add(velocity);

      // Check collision before moving
      // Player radius is roughly 0.5 units
      if (this.collisionSystem.canMoveTo(targetPosition, 0.5)) {
        this.playerRoot.position.copy(targetPosition);
      } else {
        // Simple slide logic: try moving along X only, then Z only
        const targetX = this.playerRoot.position.clone().add(new THREE.Vector3(velocity.x, 0, 0));
        const targetZ = this.playerRoot.position.clone().add(new THREE.Vector3(0, 0, velocity.z));
        
        if (this.collisionSystem.canMoveTo(targetX, 0.5)) {
          this.playerRoot.position.copy(targetX);
        } else if (this.collisionSystem.canMoveTo(targetZ, 0.5)) {
          this.playerRoot.position.copy(targetZ);
        }
      }

      // Rotate player smoothly towards movement direction
      const targetAngle = Math.atan2(this.direction.x, this.direction.z);
      
      const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
      this.playerRoot.quaternion.slerp(targetQuaternion, rotationSpeed * deltaTime);
    } else {
      this._isMoving = false;
    }
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}
