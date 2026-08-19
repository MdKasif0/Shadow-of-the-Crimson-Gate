import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';
import { lerp } from '../utils/MathUtils';

export class CameraController {
  public camera: THREE.OrthographicCamera;
  
  // Offset relative to the target
  private offset: THREE.Vector3;
  private currentPos: THREE.Vector3;

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

    // Position camera at an isometric angle (e.g. looking down 45 degrees, rotated 45 degrees)
    // The prompt requested above, behind, angled downward. 
    this.offset = new THREE.Vector3(0, 30, 30);
    this.currentPos = new THREE.Vector3().copy(this.offset);
    this.camera.position.copy(this.currentPos);
    
    // We want the player in the lower-middle of the screen, so we look slightly ahead of the camera's true target.
    // We'll achieve this by shifting the target point in update()
    
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

  public update(target: THREE.Vector3, dt: number): void {
    // 1. Determine desired camera position (tracking the player)
    // To place player in lower-middle, we shift the camera's focus point *forward* along the Z axis (or adjust offset).
    // Let's just shift the target point.
    const screenOffset = new THREE.Vector3(0, 0, -8); // Look ahead of player
    
    const desiredTarget = target.clone().add(screenOffset);
    const desiredPos = desiredTarget.clone().add(this.offset);

    // 2. Smoothly interpolate current camera position
    // We use dt to make interpolation frame-rate independent
    const blend = 1.0 - Math.pow(0.001, dt);
    
    this.currentPos.lerp(desiredPos, blend);

    // 3. Clamp camera to prevent revealing the void
    // The view covers roughly `zoom * aspect` in X, and `zoom` in Z.
    const aspect = this.camera.right / GAME_CONFIG.CAMERA.ZOOM;
    const viewWidth = GAME_CONFIG.CAMERA.ZOOM * aspect;
    const viewDepth = GAME_CONFIG.CAMERA.ZOOM; // Actually the true depth depends on the camera angle, but orthographic mapping is flat

    // We only clamp the focus target, then re-apply offset
    const clampedTarget = this.currentPos.clone().sub(this.offset);
    
    clampedTarget.x = THREE.MathUtils.clamp(clampedTarget.x, this.minX + viewWidth, this.maxX - viewWidth);
    
    // Because camera is angled at 45 degrees, the visible Z depth on the ground plane is roughly viewDepth / sin(45)
    const zVisibleDepth = viewDepth * 1.414;
    clampedTarget.z = THREE.MathUtils.clamp(clampedTarget.z, this.minZ + zVisibleDepth, this.maxZ - zVisibleDepth*0.2);
    
    this.currentPos.copy(clampedTarget).add(this.offset);

    // 4. Apply position and rotation
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(clampedTarget);
  }
}
