import * as THREE from 'three';
import { Interactable } from './Interactable';
import { InputManager } from '../core/InputManager';
import { EventBus } from '../core/EventBus';

export class InteractionSystem {
  private interactables: Map<string, Interactable> = new Map();
  private activeInteractable: Interactable | null = null;
  private wasInteractPressed: boolean = false;

  public register(interactable: Interactable): void {
    this.interactables.set(interactable.id, interactable);
  }

  public unregister(id: string): void {
    this.interactables.delete(id);
    if (this.activeInteractable?.id === id) {
      this.clearActive();
    }
  }

  public update(playerPos: THREE.Vector3, inputManager: InputManager): void {
    let nearest: Interactable | null = null;
    let minSqDist = Infinity;

    for (const interactable of this.interactables.values()) {
      if (!interactable.canInteract()) continue;

      const sqDist = playerPos.distanceToSquared(interactable.position);
      const r = interactable.radius;
      if (sqDist < r * r && sqDist < minSqDist) {
        minSqDist = sqDist;
        nearest = interactable;
      }
    }

    if (nearest !== this.activeInteractable) {
      if (nearest) {
        EventBus.emit('showInteractPrompt', { label: nearest.label });
      } else {
        this.clearActive();
      }
      this.activeInteractable = nearest;
    }

    const isPressed = inputManager.isPressed('KeyE');
    if (isPressed && !this.wasInteractPressed && this.activeInteractable) {
      this.activeInteractable.onInteract();
      this.clearActive(); // Hide prompt immediately after interacting
    }
    this.wasInteractPressed = isPressed;
  }

  private clearActive(): void {
    EventBus.emit('hideInteractPrompt', {});
    this.activeInteractable = null;
  }
}
