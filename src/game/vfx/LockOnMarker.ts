import * as THREE from 'three';

function createMarkerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(64, 64);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;

  // Four corner brackets of a rotated square
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-14, -46);
    ctx.lineTo(0, -56);
    ctx.lineTo(14, -46);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

export interface LockOnMarker {
  update(target: THREE.Vector3 | null, height: number, time: number): void;
}

/** A reticle floating over the locked target. It draws over the world, so it's never lost. */
export function createLockOnMarker(scene: THREE.Scene): LockOnMarker {
  const material = new THREE.SpriteMaterial({
    map: createMarkerTexture(),
    color: new THREE.Color(3, 1.1, 0.8),
    depthTest: false,
    depthWrite: false,
    fog: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 10;
  sprite.visible = false;
  scene.add(sprite);

  return {
    update(target, height, time) {
      sprite.visible = target !== null;
      if (!target) return;
      sprite.position.set(target.x, target.y + height, target.z);
      sprite.scale.setScalar(0.85 + Math.sin(time * 5) * 0.06);
      material.rotation = time * 0.9;
    },
  };
}
