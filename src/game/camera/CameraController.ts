import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';

export class CameraController {
  public camera: THREE.OrthographicCamera;
  private containerId: string;
  private target: THREE.Object3D | null = null;
  private targetOffset: THREE.Vector3 = new THREE.Vector3();
  private focusPosition: THREE.Vector3 = new THREE.Vector3();
  private deadZoneRadius: number = 2.0;

  constructor(containerId: string) {
    this.containerId = containerId;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    this.resize();
    this.setupCameraAngle();
  }

  private setupCameraAngle(): void {
    // Initial position behind and above the player
    this.camera.position.set(
      GAME_CONFIG.CAMERA.OFFSET.x,
      GAME_CONFIG.CAMERA.OFFSET.y,
      GAME_CONFIG.CAMERA.OFFSET.z
    );
    // Look downward at a cinematic angle (approx 35-45 degrees)
    this.camera.lookAt(0, 0, 0);
  }

  public setTarget(target: THREE.Object3D): void {
    this.target = target;
    this.focusPosition.copy(target.position);
  }

  public resize(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    const size = GAME_CONFIG.CAMERA.ORTHO_SIZE;
    
    this.camera.left = -size * aspect;
    this.camera.right = size * aspect;
    this.camera.top = size;
    this.camera.bottom = -size;
    this.camera.updateProjectionMatrix();
  }

  public update(deltaTime: number): void {
    if (!this.target) return;

    // 1. Dead Zone Logic
    // Only update focusPosition if the player moves outside the deadZoneRadius
    const distanceToFocus = this.target.position.distanceTo(this.focusPosition);
    if (distanceToFocus > this.deadZoneRadius) {
      // Move focus position towards the player by the excess distance
      const direction = new THREE.Vector3().subVectors(this.target.position, this.focusPosition).normalize();
      const excess = distanceToFocus - this.deadZoneRadius;
      this.focusPosition.add(direction.multiplyScalar(excess));
    }

    // 2. Camera Offset Logic (Lower-middle portion of screen)
    // We add the standard offset to the focusPosition
    const desiredPosition = new THREE.Vector3().copy(this.focusPosition).add(GAME_CONFIG.CAMERA.OFFSET);
    
    // We offset the look-target slightly backwards so the player appears lower on the screen
    // Positive Z in Three.js orthogonal downward view usually brings the player down on the screen
    const screenLowerOffset = new THREE.Vector3(0, 0, 3.0); 

    // Clamp the desired position to world bounds to prevent seeing empty space
    const bounds = GAME_CONFIG.WORLD.BOUNDS;
    desiredPosition.x = THREE.MathUtils.clamp(desiredPosition.x, bounds.minX, bounds.maxX);
    desiredPosition.z = THREE.MathUtils.clamp(desiredPosition.z, bounds.minZ, bounds.maxZ);

    // Smooth lerp for cinematic tracking
    this.camera.position.lerp(desiredPosition, GAME_CONFIG.CAMERA.LERP_SPEED * deltaTime);

    // Look at the offset focus point to shift player to bottom third of screen
    this.targetOffset.copy(this.focusPosition).add(GAME_CONFIG.CAMERA.TARGET_OFFSET).add(screenLowerOffset);
    this.camera.lookAt(this.targetOffset);
  }
}
