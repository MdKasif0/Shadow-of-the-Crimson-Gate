import * as THREE from 'three';

export interface Interactable {
  id: string;
  position: THREE.Vector3;
  radius: number;
  label: string;
  onInteract: () => void;
  canInteract: () => boolean;
}
