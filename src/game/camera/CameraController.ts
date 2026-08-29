import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';
import { CameraShake } from './CameraShake';

/**
 * CameraController — Orthographic isometric camera with smooth tracking and shake.
 */
export class CameraController {
  public camera: THREE.OrthographicCamera;
  
  // Offset relative to the target
  private offset: THREE.Vector3;
  private currentPos: THREE.Vector3;
  
  // Shake module
  private shake: CameraShake = new CameraShake();

  // The world boundary to clamp the camera against
  private minX: number;
  private maxX: number;
  private minZ: number;
  private maxZ: number;

  constructor() {
    const aspect = window.innerWidth / window.innerHeight;
    const zoom = GAME_CONFIG.CAMERA.ZOOM;

    this.camera = new THREE.OrthographicCamera(
      -zoom * aspect,
      zoom * aspect,
      zoom,
      -zoom,
      GAME_CONFIG.CAMERA.NEAR,
      GAME_CONFIG.CAMERA.FAR
    );

    this.offset = new THREE.Vector3(0, 30, 30);
    this.currentPos = new THREE.Vector3().copy(this.offset);
    this.camera.position.copy(this.currentPos);
    
    this.camera.lookAt(0, 0, 0);

    const b = GAME_CONFIG.WORLD.BOUNDS;
    this.minX = b.MIN_X;
    this.maxX = b.MAX_X;
    this.minZ = b.MIN_Z;
    this.maxZ = b.MAX_Z;
  }

  public resize(width: number, height: number): void {
    const aspect = width / height;
    const zoom = GAME_CONFIG.CAMERA.ZOOM;
    this.camera.left = -zoom * aspect;
    this.camera.right = zoom * aspect;
    this.camera.top = zoom;
    this.camera.bottom = -zoom;
    this.camera.updateProjectionMatrix();
  }

  public addShake(intensity: number): void {
    this.shake.addShake(intensity);
  }

  public overrideTarget: THREE.Vector3 | null = null;
  public overrideZoom: number | null = null;

  public update(target: THREE.Vector3, dt: number): void {
    // 1. Determine desired camera position
    const activeTarget = this.overrideTarget || target;
    const screenOffset = new THREE.Vector3(0, 0, -8);
    
    const desiredTarget = activeTarget.clone().add(screenOffset);
    const desiredPos = desiredTarget.clone().add(this.offset);

    // Apply zoom override if present
    const targetZoom = this.overrideZoom !== null ? this.overrideZoom : 1.0;
    const currentZoom = this.camera.zoom;
    if (Math.abs(currentZoom - targetZoom) > 0.01) {
      this.camera.zoom = THREE.MathUtils.lerp(currentZoom, targetZoom, dt * 2.0);
      this.camera.updateProjectionMatrix();
    }

    // 2. Smoothly interpolate current camera position
    const blend = 1.0 - Math.pow(0.001, dt);
    
    this.currentPos.lerp(desiredPos, blend);

    // 3. Clamp camera to prevent revealing the void
    const aspect = this.camera.right / GAME_CONFIG.CAMERA.ZOOM;
    const viewWidth = GAME_CONFIG.CAMERA.ZOOM * aspect;
    const viewDepth = GAME_CONFIG.CAMERA.ZOOM;

    const clampedTarget = this.currentPos.clone().sub(this.offset);
    
    const clampMinX = this.minX + viewWidth;
    const clampMaxX = this.maxX - viewWidth;
    if (clampMinX < clampMaxX) {
      clampedTarget.x = THREE.MathUtils.clamp(clampedTarget.x, clampMinX, clampMaxX);
    } else {
      clampedTarget.x = (this.minX + this.maxX) / 2;
    }

    const clampMinZ = this.minZ + viewDepth;
    const clampMaxZ = this.maxZ; // don't clamp bottom as tightly
    if (clampMinZ < clampMaxZ) {
      clampedTarget.z = THREE.MathUtils.clamp(clampedTarget.z, clampMinZ, clampMaxZ);
    }

    // Apply clamped position
    this.currentPos.copy(clampedTarget).add(this.offset);
    
    // Smooth damping for a cinematic feel
    const smoothedPos = new THREE.Vector3().copy(this.camera.position).lerp(this.currentPos, 1.0 - Math.pow(0.005, dt));
    this.camera.position.copy(smoothedPos);

    // Apply procedural shake
    this.shake.apply(this.currentPos, dt);

    // 4. Apply position and rotation
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(clampedTarget);
  }
}
