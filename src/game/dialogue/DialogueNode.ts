// ─── Dialogue Node ──────────────────────────────────────────────────────────

import { DialogueChoice } from './DialogueChoice';

export interface DialogueNode {
  id: string;
  speaker: string;       // Name displayed, e.g. "Shrine Keeper", "???"
  text: string;           // The dialogue text
  next?: string;          // ID of the next node (linear)
  choices?: DialogueChoice[];  // Optional branching
}
