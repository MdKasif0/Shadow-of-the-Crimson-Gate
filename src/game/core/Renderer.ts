import * as THREE from 'three';

export class Renderer {
  public webGLRenderer: THREE.WebGLRenderer;
  private containerId: string;

  constructor(containerId: string) {
    this.containerId = containerId;
    
    // Initialize WebGLRenderer with optimal settings
    this.webGLRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false, // Ensure cinematic black background if nothing renders
      powerPreference: 'high-performance'
    });

    // Color Management for Cinematic Look
    this.webGLRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.webGLRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.webGLRenderer.toneMappingExposure = 0.8; // Tuned for dark atmosphere

    // Shadow Map configuration
    this.webGLRenderer.shadowMap.enabled = true;
    this.webGLRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Pixel Ratio capped for performance
    this.webGLRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.attachToDOM();
    this.resize();
  }

  private attachToDOM(): void {
    const container = document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`[Renderer] Container element with id '${this.containerId}' not found.`);
    }
    
    // Clear any existing children (e.g. old Phaser canvas)
    container.innerHTML = '';
    container.appendChild(this.webGLRenderer.domElement);
  }

  public resize(): void {
    const container = document.getElementById(this.containerId);
    if (container) {
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.webGLRenderer.setSize(width, height);
    } else {
      // Fallback to window dimensions if container is lost
      this.webGLRenderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.webGLRenderer.render(scene, camera);
  }

  public destroy(): void {
    this.webGLRenderer.dispose();
    const container = document.getElementById(this.containerId);
    if (container && this.webGLRenderer.domElement.parentElement === container) {
      container.removeChild(this.webGLRenderer.domElement);
    }
  }
}
