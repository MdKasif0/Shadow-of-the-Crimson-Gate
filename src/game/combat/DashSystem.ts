import * as THREE from 'three';
import { PlayerState, MovementState } from './PlayerState';
import { AudioManager } from '../audio/AudioManager';

export class DashSystem {
  private state: PlayerState;
  
  public isDashing: boolean = false;
  private dashTimer: number = 0;
  private cooldownTimer: number = 0;
  
  private dashDuration: number = 0.18;
  private dashCooldown: number = 0.6;
  private dashSpeed: number = 18.0;
  
  public dashDirection: THREE.Vector3 = new THREE.Vector3();

  /** How far through the dash, 0 to 1, while dashing. */
  public get progress(): number {
    return this.isDashing ? Math.min(1, this.dashTimer / this.dashDuration) : 0;
  }

  constructor(state: PlayerState) {
    this.state = state;
  }

  public tryDash(movementDir: THREE.Vector3, facingRotation: number): boolean {
    if (this.isDashing || this.cooldownTimer > 0) return false;
    if (this.state.movement === MovementState.HURT || this.state.movement === MovementState.DEAD) return false;

    this.isDashing = true;
    this.dashTimer = 0;
    this.cooldownTimer = this.dashCooldown;
    
    AudioManager.playDash();
    
    // Lock player state
    this.state.movement = MovementState.DASH;
    
    // Determine direction
    if (movementDir.lengthSq() > 0.01) {
      this.dashDirection.copy(movementDir).normalize();
    } else {
      // Use facing direction if no movement input
      this.dashDirection.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), facingRotation).normalize();
    }
    
    return true;
  }

  public update(dt: number): THREE.Vector3 | null {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    if (this.isDashing) {
      this.dashTimer += dt;
      
      if (this.dashTimer >= this.dashDuration) {
        this.isDashing = false;
        if (this.state.movement === MovementState.DASH) {
          this.state.movement = MovementState.IDLE;
        }
        return null;
      }
      
      // Explodes off the mark and eases into the landing; the distance covered is the same
      const t = Math.min(1, this.dashTimer / this.dashDuration);
      const burst = 1.45 - 0.9 * t;
      return this.dashDirection.clone().multiplyScalar(this.dashSpeed * burst * dt);
    }
    
    return null;
  }
}
