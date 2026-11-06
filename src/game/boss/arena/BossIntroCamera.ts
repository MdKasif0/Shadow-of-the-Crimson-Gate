import * as THREE from 'three';
import { CameraController, easeInOut } from '../../camera/CameraController';

/**
 * BossIntroCamera — Three-shot reveal when entering the arena: a rising push
 * past the player, a low hero orbit around the boss for the title card, then
 * a move back down behind the player.
 */
export class BossIntroCamera {
  private cameraController: CameraController;
  private isRunning: boolean = false;

  constructor(cameraController: CameraController) {
    this.cameraController = cameraController;
  }

  public get isActive(): boolean {
    return this.isRunning;
  }

  /** True during the hero orbit, when the title card should show. */
  public get isHolding(): boolean {
    return this.isRunning && this.cameraController.currentShotIndex === 1;
  }

  public start(bossPos: THREE.Vector3, playerPos: THREE.Vector3): void {
    this.isRunning = true;

    const boss = bossPos.clone();
    const player = playerPos.clone();
    const startPosition = this.cameraController.camera.position.clone();
    const orbitRadius = 8.5;

    const orbitPoint = (angle: number, height: number, out: THREE.Vector3) =>
      out.set(boss.x + Math.sin(angle) * orbitRadius, height, boss.z + Math.cos(angle) * orbitRadius);

    const orbitStart = new THREE.Vector3();
    orbitPoint(-0.8, 0.9, orbitStart);

    this.cameraController.playSequence([
      {
        // Push past the player, rising to reveal the boss across the arena
        duration: 2.2,
        sample: (t, position, look) => {
          const e = easeInOut(t);
          position.lerpVectors(startPosition, orbitStart, e);
          position.y += Math.sin(t * Math.PI) * 5;
          look.lerpVectors(player, boss, e);
          look.y = THREE.MathUtils.lerp(1.5, 2.8, e);
          return 44;
        },
      },
      {
        // Low-angle slow orbit, so the boss looms over the frame
        duration: 3.4,
        sample: (t, position, look) => {
          orbitPoint(-0.8 + t * 1.3, 0.9 + t * 0.5, position);
          look.set(boss.x, 3.1, boss.z);
          return 38 + t * 4;
        },
      },
    ], () => {
      this.isRunning = false;
    });
  }

  /** The sequence runs inside CameraController. Kept so GameScene's call stays simple. */
  public update(_dt: number, _playerPos: THREE.Vector3, _bossPos: THREE.Vector3): void {}
}
