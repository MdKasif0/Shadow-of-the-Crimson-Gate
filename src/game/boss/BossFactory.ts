import * as THREE from 'three';
import { CharacterRig } from '../characters/CharacterRig';
import { buildCrimsonOni, OniModel } from '../enemies/EnemyModels';

const HEALTHY_TINT = new THREE.Color();
const ENRAGED_TINT = new THREE.Color(1.5, 0.95, 0.95);
const DEFEATED_TINT = new THREE.Color(0.35, 0.3, 0.3);

/**
 * BossFactory — Builds the Crimson Oni, and drives how it looks through its phases.
 */
export class BossFactory {
  private static oni: OniModel | null = null;

  public static setPhaseMaterials(phaseId: number): void {
    if (!this.oni) return;
    const { eyes, core, body } = this.oni;

    if (phaseId === 1) {
      eyes.emissiveIntensity = 8.0;
      core.emissiveIntensity = 4.0;
      core.color.setHex(0xff0000);
      core.emissive.setHex(0xff0000);
    } else if (phaseId === 2) {
      eyes.emissiveIntensity = 15.0;
      core.emissiveIntensity = 8.0;
      core.color.setHex(0xff3300);
      core.emissive.setHex(0xff3300);
      body.color.copy(this.baseTint).multiply(ENRAGED_TINT);
    } else {
      eyes.emissiveIntensity = 3.0;
      core.emissiveIntensity = 1.5;
      core.color.setHex(0xff1100);
      core.emissive.setHex(0xff1100);
      body.color.copy(this.baseTint).multiply(HEALTHY_TINT);
    }
  }

  public static fadeDefeatedMaterials(dt: number): void {
    if (!this.oni) return;
    const { eyes, core, body } = this.oni;
    const fade = dt * 1.5;
    eyes.emissiveIntensity = THREE.MathUtils.lerp(eyes.emissiveIntensity, 0, fade);
    core.emissiveIntensity = THREE.MathUtils.lerp(core.emissiveIntensity, 0, fade);
    body.color.lerp(this.defeatedTint, fade);
  }

  private static baseTint = new THREE.Color(1, 1, 1);
  private static defeatedTint = new THREE.Color(1, 1, 1);

  public static createCrimsonOni(): CharacterRig {
    this.oni = buildCrimsonOni();
    this.baseTint.copy(this.oni.body.color);
    this.defeatedTint.copy(this.baseTint).multiply(DEFEATED_TINT);
    return this.oni.rig;
  }
}
