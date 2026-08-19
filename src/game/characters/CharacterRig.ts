import * as THREE from 'three';

/**
 * Procedural bone hierarchy using THREE.Group.
 */
export class CharacterRig {
  public root: THREE.Group;
  
  public pelvis: THREE.Group;
  public spine: THREE.Group;
  public chest: THREE.Group;
  public neck: THREE.Group;
  public head: THREE.Group;

  public leftUpperArm: THREE.Group;
  public leftLowerArm: THREE.Group;
  public leftHand: THREE.Group;

  public rightUpperArm: THREE.Group;
  public rightLowerArm: THREE.Group;
  public rightHand: THREE.Group;

  public leftUpperLeg: THREE.Group;
  public leftLowerLeg: THREE.Group;
  public leftFoot: THREE.Group;

  public rightUpperLeg: THREE.Group;
  public rightLowerLeg: THREE.Group;
  public rightFoot: THREE.Group;

  // Prop attachment points
  public weaponSlot: THREE.Group;
  public sheathSlot: THREE.Group;

  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'RigRoot';

    // Core body
    this.pelvis = this.createBone('Pelvis', this.root);
    this.spine = this.createBone('Spine', this.pelvis);
    this.chest = this.createBone('Chest', this.spine);
    this.neck = this.createBone('Neck', this.chest);
    this.head = this.createBone('Head', this.neck);

    // Left Arm
    this.leftUpperArm = this.createBone('LeftUpperArm', this.chest);
    this.leftLowerArm = this.createBone('LeftLowerArm', this.leftUpperArm);
    this.leftHand = this.createBone('LeftHand', this.leftLowerArm);

    // Right Arm
    this.rightUpperArm = this.createBone('RightUpperArm', this.chest);
    this.rightLowerArm = this.createBone('RightLowerArm', this.rightUpperArm);
    this.rightHand = this.createBone('RightHand', this.rightLowerArm);

    // Left Leg
    this.leftUpperLeg = this.createBone('LeftUpperLeg', this.pelvis);
    this.leftLowerLeg = this.createBone('LeftLowerLeg', this.leftUpperLeg);
    this.leftFoot = this.createBone('LeftFoot', this.leftLowerLeg);

    // Right Leg
    this.rightUpperLeg = this.createBone('RightUpperLeg', this.pelvis);
    this.rightLowerLeg = this.createBone('RightLowerLeg', this.rightUpperLeg);
    this.rightFoot = this.createBone('RightFoot', this.rightLowerLeg);

    // Slots
    this.weaponSlot = this.createBone('WeaponSlot', this.rightHand);
    this.sheathSlot = this.createBone('SheathSlot', this.pelvis);

    this.setupDefaultProportions();
  }

  private createBone(name: string, parent: THREE.Group): THREE.Group {
    const bone = new THREE.Group();
    bone.name = name;
    parent.add(bone);
    return bone;
  }

  private setupDefaultProportions(): void {
    // These are relative offsets from parent bone.
    // Base scale is roughly 1 unit = 1 meter. Ronin is ~1.8m tall.
    
    // Pelvis is the center of mass, roughly 1.0m off the ground
    this.pelvis.position.set(0, 1.0, 0);
    
    this.spine.position.set(0, 0.15, 0);
    this.chest.position.set(0, 0.25, 0);
    this.neck.position.set(0, 0.2, 0);
    this.head.position.set(0, 0.1, 0);

    // Arms (shoulder joints)
    this.leftUpperArm.position.set(0.25, 0.15, 0);
    this.rightUpperArm.position.set(-0.25, 0.15, 0);
    
    this.leftLowerArm.position.set(0.05, -0.28, 0);
    this.rightLowerArm.position.set(-0.05, -0.28, 0);

    this.leftHand.position.set(0, -0.25, 0);
    this.rightHand.position.set(0, -0.25, 0);

    // Legs (hip joints)
    this.leftUpperLeg.position.set(0.12, -0.1, 0);
    this.rightUpperLeg.position.set(-0.12, -0.1, 0);

    this.leftLowerLeg.position.set(0, -0.45, 0);
    this.rightLowerLeg.position.set(0, -0.45, 0);

    this.leftFoot.position.set(0, -0.4, 0.05);
    this.rightFoot.position.set(0, -0.4, 0.05);

    // Sheath rests on left hip
    this.sheathSlot.position.set(0.2, -0.1, 0.1);
    this.sheathSlot.rotation.set(-0.2, 0, 0.4);
  }
}
