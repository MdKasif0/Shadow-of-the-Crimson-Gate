import * as THREE from 'three';
import { CameraShake } from './CameraShake';
import { GAME_CONFIG } from '../GameConfig';
import { SettingsManager } from '../settings/SettingsManager';
import { TerrainGenerator } from '../world/TerrainGenerator';

const BASE_FOV = 50;
const PIVOT_HEIGHT = 1.45;

const DEFAULT_PITCH = 0.3;
const MIN_PITCH = -0.1; // Just under eye level, looking slightly up
const MAX_PITCH = 1.3;  // Nearly overhead

const MAX_FOCUS_SHIFT = 2;
const DASH_KICK_DECAY = 3;
const LOOK_SENSITIVITY = 0.0024;
const BLEND_OUT_SECONDS = 1.3;

/** One camera move: `sample` writes the position and look-at for t in 0..1, and may return a FOV. */
export interface CameraShot {
  duration: number;
  sample(t: number, position: THREE.Vector3, look: THREE.Vector3): number | void;
}

/** Fraction of the remaining distance to cover this frame, independent of frame rate. */
const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Shortest signed difference between two angles. */
function angleDelta(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export const easeInOut = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * CameraController — Third-person orbit camera with follow, combat framing,
 * dialogue two-shots and cinematic sequences.
 *
 * Yaw is 0 when the camera is on the +Z side of the player looking towards -Z.
 */
export class CameraController {
  public camera: THREE.PerspectiveCamera;

  public yaw: number = 0;
  private pitch: number = DEFAULT_PITCH;
  private distance: number = 9;

  private pivot = new THREE.Vector3(0, PIVOT_HEIGHT, GAME_CONFIG.PLAYER.SPAWN_Z);
  private lead = new THREE.Vector3();
  private rigPosition = new THREE.Vector3();
  private lookPoint = new THREE.Vector3();
  private secondsSinceLook: number = 100;
  private combatWeight: number = 0;
  private dashKick: number = 0;

  private shake = new CameraShake();

  // Set each frame by the game to describe what is happening
  public moveDirection = new THREE.Vector3();
  public isSprinting: boolean = false;
  public combatFocus: THREE.Vector3 | null = null;
  public isBossFocus: boolean = false;
  public dialogueFocus: THREE.Vector3 | null = null;
  public isDeathOrbit: boolean = false;

  // Cinematic sequence
  private shots: CameraShot[] = [];
  private shotIndex: number = 0;
  private shotTime: number = 0;
  private onSequenceDone: (() => void) | null = null;
  private shotPosition = new THREE.Vector3();
  private shotLook = new THREE.Vector3();
  private shotFov: number = BASE_FOV;
  private blendOut: number = 0;

  // Scratch vectors, to avoid per-frame garbage
  private pivotTarget = new THREE.Vector3();
  private toFocus = new THREE.Vector3();

  constructor() {
    this.camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.3, 1400);
    this.snapTo(this.pivot);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public addShake(intensity: number): void {
    const { cameraShake, reduceMotion } = SettingsManager.getInstance().get();
    if (!cameraShake || reduceMotion) return;
    this.shake.addShake(intensity);
  }

  public addDashKick(): void {
    if (!SettingsManager.getInstance().get().reduceMotion) this.dashKick = 1;
  }

  /** Applies mouse movement, in pixels. */
  public look(deltaX: number, deltaY: number): void {
    if (deltaX === 0 && deltaY === 0) return;
    this.yaw -= deltaX * LOOK_SENSITIVITY;
    this.pitch = THREE.MathUtils.clamp(this.pitch + deltaY * LOOK_SENSITIVITY, MIN_PITCH, MAX_PITCH);
    this.secondsSinceLook = 0;
  }

  /** Jumps straight behind the player, facing `yaw`, for respawns and loads. */
  public snapTo(target: THREE.Vector3, yaw: number = 0): void {
    this.cancelSequence();
    this.yaw = yaw;
    this.pitch = DEFAULT_PITCH;
    this.distance = 9;
    this.blendOut = 0;
    this.shake.reset();
    this.lead.set(0, 0, 0);
    this.pivot.set(target.x, target.y + PIVOT_HEIGHT, target.z);
    this.computeRig();
    this.camera.position.copy(this.rigPosition);
    this.camera.lookAt(this.pivot);
  }

  public get isSequencePlaying(): boolean {
    return this.shotIndex < this.shots.length;
  }

  public get currentShotIndex(): number {
    return this.shotIndex;
  }

  /** Plays shots one after another, then blends smoothly back to the follow camera. */
  public playSequence(shots: CameraShot[], onDone?: () => void): void {
    this.shots = shots;
    this.shotIndex = 0;
    this.shotTime = 0;
    this.onSequenceDone = onDone ?? null;
    this.blendOut = 0;
  }

  public cancelSequence(): void {
    this.shots = [];
    this.shotIndex = 0;
    this.onSequenceDone = null;
  }

  /** `isFrozen` holds gameplay-driven motion while paused, but still renders. */
  public update(target: THREE.Vector3, dt: number, isFrozen: boolean = false): void {
    const step = isFrozen ? 0 : dt;
    this.secondsSinceLook += step;

    this.updateFollow(target, step);

    if (this.isSequencePlaying) {
      this.advanceSequence(step);
    }

    let fov: number;
    if (this.isSequencePlaying) {
      this.camera.position.copy(this.shotPosition);
      this.lookPoint.copy(this.shotLook);
      fov = this.shotFov;
    } else {
      this.camera.position.copy(this.rigPosition);
      this.lookPoint.copy(this.pivot);
      fov = this.followFov();

      if (this.blendOut > 0) {
        const weight = easeInOut(this.blendOut);
        this.camera.position.lerp(this.shotPosition, weight);
        this.lookPoint.lerp(this.shotLook, weight);
        fov = THREE.MathUtils.lerp(fov, this.shotFov, weight);
        this.blendOut = Math.max(0, this.blendOut - step / BLEND_OUT_SECONDS);
      }
    }

    // Never dip into the hills
    const groundY = TerrainGenerator.heightAt(this.camera.position.x, this.camera.position.z);
    this.camera.position.y = Math.max(this.camera.position.y, groundY + 0.4);

    this.camera.lookAt(this.lookPoint);

    this.shake.update(step);
    this.camera.position.add(this.shake.offset);
    this.camera.rotateZ(this.shake.roll);

    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov += (fov - this.camera.fov) * damp(6, Math.max(step, 0.001));
      this.camera.updateProjectionMatrix();
    }
  }

  private followFov(): number {
    if (SettingsManager.getInstance().get().reduceMotion) return BASE_FOV;
    return BASE_FOV + (this.isSprinting ? 6 : 0) + this.dashKick * 7 - this.combatWeight * 3;
  }

  private updateFollow(target: THREE.Vector3, dt: number): void {
    this.updateAutoAim(target, dt);
    this.dashKick = Math.max(0, this.dashKick - dt * DASH_KICK_DECAY);

    // Lead slightly in the direction of travel, so more of what's ahead is visible
    const leadAmount = this.dialogueFocus ? 0 : (this.isSprinting ? 2.2 : 1.2);
    this.lead.lerp(this.toFocus.copy(this.moveDirection).multiplyScalar(leadAmount), damp(2.5, dt));

    this.pivotTarget.set(target.x, target.y + PIVOT_HEIGHT, target.z).add(this.lead);

    // Pull the framing towards whatever the player is fighting or talking to
    const focus = this.dialogueFocus ?? this.combatFocus;
    const hasCombatFocus = !this.dialogueFocus && this.combatFocus !== null;
    this.combatWeight += ((hasCombatFocus ? 1 : 0) - this.combatWeight) * damp(3, dt);
    if (focus) {
      this.toFocus.copy(focus).sub(target).setY(0);
      const shift = this.dialogueFocus ? 0.5 : 0.2;
      // Capped, so a distant enemy can't push the player out of the frame
      this.pivotTarget.addScaledVector(this.toFocus, shift * Math.min(1, MAX_FOCUS_SHIFT / Math.max(this.toFocus.length() * shift, 0.01)));
      if (this.isBossFocus) this.pivotTarget.y += 0.6;
    }

    this.pivot.lerp(this.pivotTarget, damp(this.isSprinting ? 9 : 7, dt));

    // Distance: closer in fights and conversations, further when sprinting or facing the boss
    let wantDistance = 8.5;
    if (this.isSprinting) wantDistance = 9.8;
    if (hasCombatFocus) wantDistance = this.isBossFocus ? 10.5 : 7;
    if (this.dialogueFocus) wantDistance = 4.6;
    if (this.isDeathOrbit) wantDistance = 5.5;
    this.distance += (wantDistance - this.distance) * damp(2.2, dt);

    this.computeRig();
  }

  /** Turns the camera on its own only when the player isn't steering it with the mouse. */
  private updateAutoAim(target: THREE.Vector3, dt: number): void {
    if (this.isDeathOrbit) {
      this.yaw += dt * 0.22;
      this.pitch += (0.42 - this.pitch) * damp(1, dt);
      return;
    }

    if (this.dialogueFocus) {
      // A two-shot from the side nearest the camera, like a film conversation
      this.toFocus.copy(this.dialogueFocus).sub(target);
      const axis = Math.atan2(this.toFocus.x, this.toFocus.z);
      const sideA = axis + Math.PI / 2;
      const sideB = axis - Math.PI / 2;
      const side = Math.abs(angleDelta(this.yaw, sideA)) < Math.abs(angleDelta(this.yaw, sideB)) ? sideA : sideB;
      this.yaw += angleDelta(this.yaw, side) * damp(2.5, dt);
      this.pitch += (0.1 - this.pitch) * damp(2.5, dt);
      return;
    }

    if (this.combatFocus && this.secondsSinceLook > 1.2) {
      // Swing round so the player and the enemy are both in frame
      const towardsEnemy = Math.atan2(target.x - this.combatFocus.x, target.z - this.combatFocus.z);
      const rate = this.isBossFocus ? 1.8 : 0.9;
      this.yaw += angleDelta(this.yaw, towardsEnemy) * damp(rate, dt);
      if (this.isBossFocus) this.pitch += (0.26 - this.pitch) * damp(1.2, dt);
    } else if (this.moveDirection.lengthSq() > 0.01 && this.secondsSinceLook > 1.5) {
      // Ease back behind the direction of travel, but don't spin when walking at the camera
      const behind = Math.atan2(-this.moveDirection.x, -this.moveDirection.z);
      const delta = angleDelta(this.yaw, behind);
      if (Math.abs(delta) < 2.3) this.yaw += delta * damp(this.isSprinting ? 1.1 : 0.6, dt);
    }

    // Respects a chosen angle while standing still, and settles back once travelling again
    if (this.secondsSinceLook > 5 && !this.combatFocus && this.moveDirection.lengthSq() > 0.01) {
      this.pitch += (DEFAULT_PITCH - this.pitch) * damp(0.5, dt);
    }
  }

  private computeRig(): void {
    const cosPitch = Math.cos(this.pitch);
    this.rigPosition.set(
      this.pivot.x + Math.sin(this.yaw) * cosPitch * this.distance,
      this.pivot.y + Math.sin(this.pitch) * this.distance,
      this.pivot.z + Math.cos(this.yaw) * cosPitch * this.distance,
    );
  }

  private advanceSequence(dt: number): void {
    const shot = this.shots[this.shotIndex];
    this.shotTime += dt;
    const t = Math.min(this.shotTime / shot.duration, 1);

    const fov = shot.sample(t, this.shotPosition, this.shotLook);
    if (typeof fov === 'number') this.shotFov = fov;

    if (t < 1) return;

    this.shotIndex++;
    this.shotTime = 0;
    if (!this.isSequencePlaying) {
      this.blendOut = 1;
      const done = this.onSequenceDone;
      this.onSequenceDone = null;
      done?.();
    }
  }
}
