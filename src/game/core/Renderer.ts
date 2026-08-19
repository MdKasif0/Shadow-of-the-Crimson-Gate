import * as THREE from 'three';

export class Renderer {
  public webgl: THREE.WebGLRenderer;
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;

    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    
    // Configure robust WebGL settings
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.0;
    
    // Cap pixel ratio to 2 for performance
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.webgl.setPixelRatio(pixelRatio);
    
    // Shadow maps
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.webgl.domElement);
    this.resize();
  }

  public resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.webgl.setSize(width, height);
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.webgl.render(scene, camera);
  }

  public destroy(): void {
    this.webgl.dispose();
    this.webgl.domElement.remove();
  }
}
