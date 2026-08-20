import * as THREE from 'three';
import { InputManager } from './InputManager';
import { EventBus } from './EventBus';

export interface Interactable {
  id: string;
  position: THREE.Vector3;
  radius: number;
  prompt: string;
  onInteract: () => void;
}

export class InteractionSystem {
  private interactables: Interactable[] = [];
  private activeInteractable: Interactable | null = null;
  private wasEPressed: boolean = false;

  public register(interactable: Interactable): void {
    this.interactables.push(interactable);
  }

  public update(playerPos: THREE.Vector3, inputManager: InputManager): void {
    let closest: Interactable | null = null;
    let closestDistSq = Infinity;

    // Find closest valid interactable
    for (const item of this.interactables) {
      const distSq = playerPos.distanceToSquared(item.position);
      if (distSq <= item.radius * item.radius) {
        if (distSq < closestDistSq) {
          closest = item;
          closestDistSq = distSq;
        }
      }
    }

    // UI Trigger
    if (closest !== this.activeInteractable) {
      this.activeInteractable = closest;
      if (this.activeInteractable) {
        EventBus.emit('showInteraction', { prompt: this.activeInteractable.prompt });
      } else {
        EventBus.emit('hideInteraction');
      }
    }

    // Handle input (single press)
    const isEPressed = inputManager.isPressed('KeyE');
    if (isEPressed && !this.wasEPressed && this.activeInteractable) {
      this.activeInteractable.onInteract();
      // Hide after interact
      EventBus.emit('hideInteraction');
      this.activeInteractable = null; 
    }
    this.wasEPressed = isEPressed;
  }
}
