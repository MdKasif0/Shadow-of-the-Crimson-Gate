import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';

export class DashSystem {
  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public cooldownTimer: number = 0;
  public dashDirection: THREE.Vector3 = new THREE.Vector3();
  public isInvulnerable: boolean = false;

  public tryDash(facingDirection: THREE.Vector3, movementDirection?: THREE.Vector3): boolean {
    if (this.isDashing || this.cooldownTimer > 0) return false;
    this.isDashing = true;
    this.dashTimer = 0;
    this.isInvulnerable = true;
    this.dashDirection.copy(movementDirection && movementDirection.lengthSq() > 0 ? movementDirection : facingDirection).normalize();
    return true;
  }

  public update(dt: number): void {
    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;
    if (!this.isDashing) return;

    this.dashTimer += dt;
    if (this.dashTimer > GAME_CONFIG.PLAYER.DASH.INVULNERABLE_DURATION) {
      this.isInvulnerable = false;
    }
    if (this.dashTimer >= GAME_CONFIG.PLAYER.DASH.DURATION) {
      this.isDashing = false;
      this.isInvulnerable = false;
      this.cooldownTimer = GAME_CONFIG.PLAYER.DASH.COOLDOWN;
    }
  }

  public getDashVelocity(): THREE.Vector3 {
    return this.dashDirection.clone().multiplyScalar(GAME_CONFIG.PLAYER.DASH.SPEED);
  }

  public reset(): void {
    this.isDashing = false; this.dashTimer = 0;
    this.cooldownTimer = 0; this.isInvulnerable = false;
  }
}
