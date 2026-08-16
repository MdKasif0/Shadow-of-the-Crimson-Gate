import * as THREE from 'three';

export class AnimationController {
  private mixer: THREE.AnimationMixer;
  private actions: Map<string, THREE.AnimationAction>;
  private currentAction: THREE.AnimationAction | null = null;
  private currentClipName: string | null = null;

  constructor(model: THREE.Group, animations: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = new Map();

    if (animations && animations.length > 0) {
      animations.forEach((clip) => {
        const action = this.mixer.clipAction(clip);
        // Normalize common names
        const name = clip.name.toLowerCase();
        this.actions.set(name, action);
      });
      console.log(`[AnimationController] Loaded ${animations.length} animations:`, Array.from(this.actions.keys()));
    } else {
      console.warn("[AnimationController] No animations found in the provided model.");
    }
  }

  public play(animationName: string, fadeDuration: number = 0.2): void {
    const name = animationName.toLowerCase();
    
    // If already playing this animation, ignore
    if (this.currentClipName === name) return;

    const nextAction = this.actions.get(name);
    
    if (!nextAction) {
      // Gracefully handle missing animations (since the current GLB has none)
      // We don't want to spam the console every frame, just log once or silently ignore
      this.currentClipName = name;
      return;
    }

    nextAction.reset();
    nextAction.play();

    if (this.currentAction) {
      nextAction.crossFadeFrom(this.currentAction, fadeDuration, true);
    }

    this.currentAction = nextAction;
    this.currentClipName = name;
  }

  public update(deltaTime: number): void {
    this.mixer.update(deltaTime);
  }
}
