// ─── Dialogue Manager ───────────────────────────────────────────────────────
// Orchestrates dialogue playback. Disables gameplay input while active.

import { DialogueNode } from './DialogueNode';
import { DialogueBox } from './DialogueBox';
import { EventBus } from '../core/EventBus';
import { StoryEvents } from '../story/StoryEvent';

export class DialogueManager {
  private box: DialogueBox;
  private nodes: Map<string, DialogueNode> = new Map();
  private currentNode: DialogueNode | null = null;
  private _isActive: boolean = false;

  constructor() {
    this.box = new DialogueBox();
    this.box.setChoiceCallback(this.onChoiceSelect.bind(this));
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public startDialogue(nodes: DialogueNode[]): void {
    if (this._isActive) return;

    this.nodes.clear();
    for (const node of nodes) {
      this.nodes.set(node.id, node);
    }

    this._isActive = true;
    EventBus.emit(StoryEvents.DIALOGUE_START, {});

    // Start from the first node
    const first = nodes[0];
    if (first) {
      this.showNode(first);
    }
  }

  private showNode(node: DialogueNode): void {
    this.currentNode = node;

    const choices = node.choices?.map(c => ({ label: c.label }));
    this.box.show(node.speaker, node.text, () => this.advance(), choices);
  }

  private advance(): void {
    if (!this.currentNode) return;

    // If choices exist, don't auto-advance (handled by onChoiceSelect)
    if (this.currentNode.choices && this.currentNode.choices.length > 0) return;

    if (this.currentNode.next) {
      const nextNode = this.nodes.get(this.currentNode.next);
      if (nextNode) {
        this.showNode(nextNode);
        return;
      }
    }

    // End of dialogue
    this.endDialogue();
  }

  private onChoiceSelect(index: number): void {
    if (!this.currentNode?.choices) return;

    const choice = this.currentNode.choices[index];
    if (choice) {
      const nextNode = this.nodes.get(choice.nextNodeId);
      if (nextNode) {
        this.showNode(nextNode);
        return;
      }
    }

    this.endDialogue();
  }

  private endDialogue(): void {
    this._isActive = false;
    this.currentNode = null;
    this.nodes.clear();
    this.box.hide();

    EventBus.emit(StoryEvents.DIALOGUE_END, {});
  }

  public dispose(): void {
    this.box.dispose();
  }
}
