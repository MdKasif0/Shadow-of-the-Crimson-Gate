import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';

export class CameraController {
  public camera: THREE.OrthographicCamera;
  private target: THREE.Object3D | null = null;
  private shakeIntensity: number = 0;
  private containerId: string;

  constructor(containerId: string) {
    this.containerId = containerId;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
    this.resize();
    const o = GAME_CONFIG.CAMERA.OFFSET;
    this.camera.position.set(o.x, o.y, o.z);
    this.camera.lookAt(0, 0, 0);
  }

  public setTarget(target: THREE.Object3D): void { this.target = target; }

  public resize(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    const aspect = container.clientWidth / container.clientHeight;
    const size = GAME_CONFIG.CAMERA.ORTHO_SIZE;
    this.camera.left = -size * aspect;
    this.camera.right = size * aspect;
    this.camera.top = size;
    this.camera.bottom = -size;
    this.camera.updateProjectionMatrix();
  }

  public shake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public update(dt: number): void {
    if (!this.target) return;
    const o = GAME_CONFIG.CAMERA.OFFSET;
    const desired = new THREE.Vector3(
      this.target.position.x + o.x,
      o.y,
      this.target.position.z + o.z
    );
    this.camera.position.lerp(desired, GAME_CONFIG.CAMERA.LERP_SPEED * dt);

    if (this.shakeIntensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.5;
      this.shakeIntensity *= Math.exp(-GAME_CONFIG.CAMERA.SHAKE_DECAY * dt);
    }

    const lookTarget = this.target.position.clone();
    lookTarget.y = 0;
    lookTarget.z -= 2;
    this.camera.lookAt(lookTarget);
  }
}
