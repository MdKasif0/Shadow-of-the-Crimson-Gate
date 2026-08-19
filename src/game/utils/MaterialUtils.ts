import * as THREE from 'three';

// ─── Centralized Material Factory ─────────────────────────────────────────
// All game materials in one place for consistency and efficiency.

const _cache = new Map<string, THREE.Material>();

function cached<T extends THREE.Material>(key: string, factory: () => T): T {
  if (_cache.has(key)) return _cache.get(key)! as T;
  const mat = factory();
  _cache.set(key, mat);
  return mat;
}

// ─── Stone ──────────────────────────────────────────────────────────────────
export function createStoneMaterial(): THREE.MeshStandardMaterial {
  return cached('stone', () => new THREE.MeshStandardMaterial({
    color: 0x4a4a4a, roughness: 0.85, metalness: 0.05,
  }));
}
export function createLightStoneMaterial(): THREE.MeshStandardMaterial {
  return cached('lightStone', () => new THREE.MeshStandardMaterial({
    color: 0x6a6a6a, roughness: 0.8, metalness: 0.05,
  }));
}

// ─── Wood ───────────────────────────────────────────────────────────────────
export function createWoodMaterial(): THREE.MeshStandardMaterial {
  return cached('wood', () => new THREE.MeshStandardMaterial({
    color: 0x3a2a1a, roughness: 0.75, metalness: 0.0,
  }));
}
export function createDarkWoodMaterial(): THREE.MeshStandardMaterial {
  return cached('darkWood', () => new THREE.MeshStandardMaterial({
    color: 0x1a1208, roughness: 0.7, metalness: 0.0,
  }));
}

// ─── Metal ──────────────────────────────────────────────────────────────────
export function createMetalMaterial(): THREE.MeshStandardMaterial {
  return cached('metal', () => new THREE.MeshStandardMaterial({
    color: 0x8899aa, roughness: 0.3, metalness: 0.85,
  }));
}
export function createBladeMaterial(): THREE.MeshStandardMaterial {
  return cached('blade', () => new THREE.MeshStandardMaterial({
    color: 0xc0d0e0, roughness: 0.15, metalness: 0.95,
    emissive: 0x112233, emissiveIntensity: 0.15,
  }));
}

// ─── Cloth / Leather ────────────────────────────────────────────────────────
export function createClothMaterial(color: number = 0x1a1a22): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 });
}
export function createLeatherMaterial(): THREE.MeshStandardMaterial {
  return cached('leather', () => new THREE.MeshStandardMaterial({
    color: 0x2a1a0a, roughness: 0.8, metalness: 0.05,
  }));
}

// ─── Skin ───────────────────────────────────────────────────────────────────
export function createSkinMaterial(): THREE.MeshStandardMaterial {
  return cached('skin', () => new THREE.MeshStandardMaterial({
    color: 0xc8a882, roughness: 0.7, metalness: 0.0,
  }));
}

// ─── Crimson Accent ─────────────────────────────────────────────────────────
export function createCrimsonMaterial(): THREE.MeshStandardMaterial {
  return cached('crimson', () => new THREE.MeshStandardMaterial({
    color: 0x8b1a1a, roughness: 0.6, metalness: 0.1,
    emissive: 0x330808, emissiveIntensity: 0.3,
  }));
}

// ─── Spirit / Supernatural ──────────────────────────────────────────────────
export function createSpiritMaterial(color: number = 0x88ffff): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
}

// ─── Emissive ───────────────────────────────────────────────────────────────
export function createEmissiveMaterial(color: number = 0xffaa44, intensity: number = 1.5): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: intensity,
    roughness: 0.5, metalness: 0.0,
  });
}

// ─── Foliage ────────────────────────────────────────────────────────────────
export function createSakuraFoliageMaterial(): THREE.MeshStandardMaterial {
  return cached('sakuraFoliage', () => new THREE.MeshStandardMaterial({
    color: 0xf0a0b0, roughness: 0.8, metalness: 0.0,
    side: THREE.DoubleSide,
  }));
}

// ─── Ground ─────────────────────────────────────────────────────────────────
export function createGroundMaterial(): THREE.MeshStandardMaterial {
  return cached('ground', () => {
    // Procedural ground texture
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    // Base earth tone
    ctx.fillStyle = '#2a2520';
    ctx.fillRect(0, 0, 512, 512);
    // Subtle variation
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 3 + 1;
      const brightness = Math.random() * 20 + 30;
      ctx.fillStyle = `rgb(${brightness + 5}, ${brightness}, ${brightness - 5})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // Stone path hints
    for (let i = 0; i < 80; i++) {
      const x = 200 + Math.random() * 112;
      const y = Math.random() * 512;
      ctx.fillStyle = `rgba(80, 78, 72, ${Math.random() * 0.3 + 0.1})`;
      ctx.fillRect(x, y, Math.random() * 20 + 10, Math.random() * 15 + 5);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    return new THREE.MeshStandardMaterial({
      map: texture, roughness: 0.95, metalness: 0.0,
    });
  });
}

// ─── Yokai ──────────────────────────────────────────────────────────────────
export function createYokaiSkinMaterial(): THREE.MeshStandardMaterial {
  return cached('yokaiSkin', () => new THREE.MeshStandardMaterial({
    color: 0x2a1a2a, roughness: 0.7, metalness: 0.1,
    emissive: 0x110011, emissiveIntensity: 0.2,
  }));
}
export function createYokaiEyeMaterial(): THREE.MeshBasicMaterial {
  return cached('yokaiEye', () => new THREE.MeshBasicMaterial({
    color: 0xff2200,
  }));
}

// ─── Roof ───────────────────────────────────────────────────────────────────
export function createRoofMaterial(): THREE.MeshStandardMaterial {
  return cached('roof', () => new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.7, metalness: 0.1,
  }));
}
