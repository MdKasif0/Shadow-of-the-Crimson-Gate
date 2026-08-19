import * as THREE from 'three';

export class LightingSystem {
  constructor(scene: THREE.Scene) {
    // 1. Hemisphere light (sky + ground color)
    const hemi = new THREE.HemisphereLight(0x1a2a4a, 0x0a0a0a, 0.4);
    scene.add(hemi);

    // 2. Ambient fill (subtle)
    const ambient = new THREE.AmbientLight(0x1a2a3a, 0.3);
    scene.add(ambient);

    // 3. Moonlight (primary directional)
    const moon = new THREE.DirectionalLight(0x6688cc, 1.8);
    moon.position.set(-15, 25, -10);
    moon.castShadow = true;
    moon.shadow.mapSize.width = 2048;
    moon.shadow.mapSize.height = 2048;
    moon.shadow.camera.near = 0.5;
    moon.shadow.camera.far = 80;
    const d = 30;
    moon.shadow.camera.left = -d;
    moon.shadow.camera.right = d;
    moon.shadow.camera.top = d;
    moon.shadow.camera.bottom = -d;
    moon.shadow.bias = -0.0005;
    scene.add(moon);

    // 4. Subtle rim light from behind (gives character silhouette pop)
    const rim = new THREE.DirectionalLight(0x334466, 0.6);
    rim.position.set(5, 10, 15);
    scene.add(rim);
  }
}
