import { EventBus } from '../core/EventBus';

export class ObjectiveUI {
  private container: HTMLDivElement;
  private textElement: HTMLDivElement;
  private interactElement: HTMLDivElement;
  private interactPromptTimer: any;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '40px';
    this.container.style.left = '50%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.textAlign = 'center';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '100';

    this.textElement = document.createElement('div');
    this.textElement.style.color = '#fff';
    this.textElement.style.fontFamily = 'monospace';
    this.textElement.style.fontSize = '24px';
    this.textElement.style.letterSpacing = '4px';
    this.textElement.style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
    this.textElement.style.transition = 'opacity 1s ease-in-out';
    this.textElement.style.opacity = '0';
    
    // Tiny decorative line under objective
    const line = document.createElement('div');
    line.style.width = '40px';
    line.style.height = '2px';
    line.style.backgroundColor = '#6b1111';
    line.style.margin = '8px auto 0 auto';
    this.textElement.appendChild(line);

    this.container.appendChild(this.textElement);

    this.interactElement = document.createElement('div');
    this.interactElement.style.color = '#ddd';
    this.interactElement.style.fontFamily = 'monospace';
    this.interactElement.style.fontSize = '16px';
    this.interactElement.style.letterSpacing = '1px';
    this.interactElement.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
    this.interactElement.style.marginTop = '120px'; // Push down towards character
    this.interactElement.style.transition = 'opacity 0.2s';
    this.interactElement.style.opacity = '0';
    this.container.appendChild(this.interactElement);

    document.body.appendChild(this.container);

    EventBus.on('objectiveUpdate', (data: any) => {
      this.updateObjective(data.text);
    });

    EventBus.on('showInteractPrompt', (data: any) => {
      this.interactElement.innerText = data.label;
      this.interactElement.style.opacity = '1';
      clearTimeout(this.interactPromptTimer);
    });

    EventBus.on('hideInteractPrompt', () => {
      this.interactElement.style.opacity = '0';
    });
  }

  private updateObjective(text: string): void {
    // Fade out
    this.textElement.style.opacity = '0';
    
    setTimeout(() => {
      // Update text (keep the line)
      this.textElement.innerHTML = `${text}<div style="width: 40px; height: 2px; background-color: #6b1111; margin: 8px auto 0 auto;"></div>`;
      // Fade in
      this.textElement.style.opacity = '1';
    }, 1000);
  }
}
