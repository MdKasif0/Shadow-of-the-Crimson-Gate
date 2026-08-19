import { CharacterRig, BoneMap } from './CharacterRig';
import { lerp, easeInOutCubic } from '../utils/MathUtils';

export type AnimState = 'idle' | 'walk' | 'attack1' | 'attack2' | 'attack3' | 'dash' | 'hurt' | 'death';

export class CharacterAnimator {
  private rig: CharacterRig;
  private time: number = 0;
  public state: AnimState = 'idle';
  public stateTime: number = 0;
  private walkPhase: number = 0;

  constructor(rig: CharacterRig) { this.rig = rig; }

  public setState(newState: AnimState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.stateTime = 0;
    }
  }

  public update(dt: number, isMoving: boolean): void {
    this.time += dt;
    this.stateTime += dt;
    const b = this.rig.bones;

    // Reset rotations each frame to avoid accumulation
    this.resetBones(b);

    switch (this.state) {
      case 'idle': this.animIdle(b, dt); break;
      case 'walk': this.animWalk(b, dt); break;
      case 'attack1': this.animAttack(b, 0); break;
      case 'attack2': this.animAttack(b, 1); break;
      case 'attack3': this.animAttack(b, 2); break;
      case 'dash': this.animDash(b); break;
      case 'hurt': this.animHurt(b); break;
      case 'death': this.animDeath(b); break;
    }
  }

  private resetBones(b: BoneMap): void {
    // Reset all rotations to rest pose
    Object.values(b).forEach(bone => {
      bone.rotation.set(0, 0, 0);
    });
  }

  private animIdle(b: BoneMap, _dt: number): void {
    const t = this.time;
    // Subtle breathing
    b.chest.position.y = 0.12 * 1.8 + Math.sin(t * 1.5) * 0.008;
    b.chest.rotation.x = Math.sin(t * 1.2) * 0.01;
    // Slight shoulder sway
    b.leftUpperArm.rotation.z = 0.05 + Math.sin(t * 0.8) * 0.02;
    b.rightUpperArm.rotation.z = -0.05 - Math.sin(t * 0.8) * 0.02;
    // Subtle arm hang with slight bend
    b.leftLowerArm.rotation.x = -0.15;
    b.rightLowerArm.rotation.x = -0.15;
    // Katana hand (right) slight angle
    b.rightHand.rotation.x = -0.3;
  }

  private animWalk(b: BoneMap, dt: number): void {
    this.walkPhase += dt * 8;
    const p = this.walkPhase;
    const swing = 0.5;

    // Leg swing
    b.leftUpperLeg.rotation.x = Math.sin(p) * swing;
    b.rightUpperLeg.rotation.x = Math.sin(p + Math.PI) * swing;
    // Knee bend on backward swing
    b.leftLowerLeg.rotation.x = Math.max(0, -Math.sin(p)) * 0.6;
    b.rightLowerLeg.rotation.x = Math.max(0, -Math.sin(p + Math.PI)) * 0.6;

    // Arm counter-swing
    b.leftUpperArm.rotation.x = Math.sin(p + Math.PI) * 0.35;
    b.rightUpperArm.rotation.x = Math.sin(p) * 0.25;
    b.leftLowerArm.rotation.x = -0.2;
    b.rightLowerArm.rotation.x = -0.25;
    b.rightHand.rotation.x = -0.3;

    // Torso twist
    b.spine.rotation.y = Math.sin(p) * 0.06;
    b.chest.rotation.y = Math.sin(p) * 0.04;

    // Slight bob
    b.pelvis.position.y = 0.5 * 1.8 + Math.abs(Math.sin(p)) * 0.03;

    // Head stabilize (counter-rotate)
    b.head.rotation.y = -Math.sin(p) * 0.03;
  }

  private animAttack(b: BoneMap, combo: number): void {
    const t = this.stateTime;
    const config = [
      { windup: 0.10, active: 0.12, recovery: 0.18 },
      { windup: 0.12, active: 0.14, recovery: 0.20 },
      { windup: 0.15, active: 0.18, recovery: 0.30 },
    ][combo];
    const total = config.windup + config.active + config.recovery;

    if (t < config.windup) {
      // Anticipation: pull sword back
      const f = easeInOutCubic(t / config.windup);
      b.rightUpperArm.rotation.x = lerp(0, -1.2, f);
      b.rightUpperArm.rotation.z = lerp(0, -0.5, f);
      b.rightLowerArm.rotation.x = lerp(-0.15, -0.8, f);
      b.chest.rotation.y = lerp(0, 0.3, f);
      b.spine.rotation.y = lerp(0, 0.15, f);
    } else if (t < config.windup + config.active) {
      // Slash forward
      const f = easeInOutCubic((t - config.windup) / config.active);
      const slashAngle = combo === 2 ? -0.4 : (combo === 1 ? 0.6 : 0.8);
      b.rightUpperArm.rotation.x = lerp(-1.2, slashAngle, f);
      b.rightUpperArm.rotation.z = lerp(-0.5, 0.3, f);
      b.rightLowerArm.rotation.x = lerp(-0.8, -0.1, f);
      b.chest.rotation.y = lerp(0.3, -0.4, f);
      b.spine.rotation.y = lerp(0.15, -0.2, f);
      // Lean into strike
      b.chest.rotation.x = lerp(0, combo === 2 ? 0.25 : 0.1, f);
    } else {
      // Recovery
      const f = easeInOutCubic((t - config.windup - config.active) / config.recovery);
      b.rightUpperArm.rotation.x = lerp(0.8, 0, f);
      b.rightUpperArm.rotation.z = lerp(0.3, 0, f);
      b.rightLowerArm.rotation.x = lerp(-0.1, -0.15, f);
      b.chest.rotation.y = lerp(-0.4, 0, f);
      b.spine.rotation.y = lerp(-0.2, 0, f);
      b.chest.rotation.x = lerp(0.1, 0, f);
    }
    b.rightHand.rotation.x = -0.3;
  }

  private animDash(b: BoneMap): void {
    const f = Math.min(this.stateTime / 0.18, 1);
    b.chest.rotation.x = lerp(0.4, 0.1, f);
    b.leftUpperArm.rotation.x = -0.5;
    b.rightUpperArm.rotation.x = -0.3;
    b.rightHand.rotation.x = -0.5;
    b.leftUpperLeg.rotation.x = lerp(-0.3, 0, f);
    b.rightUpperLeg.rotation.x = lerp(0.3, 0, f);
  }

  private animHurt(b: BoneMap): void {
    const f = Math.min(this.stateTime / 0.3, 1);
    b.chest.rotation.x = lerp(-0.3, 0, f);
    b.chest.rotation.z = lerp(0.15, 0, f);
    b.head.rotation.x = lerp(0.2, 0, f);
  }

  private animDeath(b: BoneMap): void {
    const f = Math.min(this.stateTime / 1.0, 1);
    const ef = easeInOutCubic(f);
    b.root.rotation.x = lerp(0, Math.PI / 2, ef);
    b.root.position.y = lerp(0, -0.5, ef);
  }
}
