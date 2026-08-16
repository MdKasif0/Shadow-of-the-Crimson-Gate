import { DEPTH } from '../config/depthConfig';

export function calculateEntityDepth(yPosition: number): number {
  return DEPTH.ENTITY_BASE + yPosition;
}

export function updateEntityDepth(entity: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container): void {
  entity.setDepth(calculateEntityDepth(entity.y));
}
