// ─── NPC Data ───────────────────────────────────────────────────────────────
// Data definitions for NPCs.

import { DialogueNode } from '../dialogue/DialogueNode';

export interface NPCDef {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  interactRadius: number;
  modelType: string;             // Key for NPCFactory
  dialogue: DialogueNode[];      // Dialogue tree
  dialogueAfterFlag?: string;    // Optional: use different dialogue after a flag is set
  dialogueAlt?: DialogueNode[];  // The alternative dialogue
}

// ─── Shrine Keeper ──────────────────────────────────────────────────────────

export const SHRINE_KEEPER_DIALOGUE: DialogueNode[] = [
  {
    id: 'sk_1',
    speaker: 'Shrine Keeper',
    text: 'You should not have come here, wanderer. The mountain has fallen silent.',
    next: 'sk_2',
  },
  {
    id: 'sk_2',
    speaker: 'Shrine Keeper',
    text: 'A darkness crept from the temple three days ago. The Crimson Oni... it has awakened.',
    next: 'sk_3',
  },
  {
    id: 'sk_3',
    speaker: 'Shrine Keeper',
    text: 'The yokai now prowl the forest paths. The shrine\'s barrier weakens with each passing hour.',
    next: 'sk_4',
  },
  {
    id: 'sk_4',
    speaker: 'Shrine Keeper',
    text: 'If you would save this place... purify the corrupted areas. Then enter the Crimson Gate and face the Oni.',
    next: 'sk_5',
  },
  {
    id: 'sk_5',
    speaker: 'Shrine Keeper',
    text: 'Be careful. The deeper you go, the stronger the corruption becomes.',
  },
];

export const SHRINE_KEEPER_DIALOGUE_ALT: DialogueNode[] = [
  {
    id: 'sk_alt_1',
    speaker: 'Shrine Keeper',
    text: 'The corruption still lingers in the air. Press forward, ronin. The temple awaits.',
  },
];

export const NPC_DATABASE: NPCDef[] = [
  {
    id: 'shrine_keeper',
    name: 'Shrine Keeper',
    position: { x: 3, y: 0, z: 25 },
    interactRadius: 4,
    modelType: 'SHRINE_KEEPER',
    dialogue: SHRINE_KEEPER_DIALOGUE,
    dialogueAfterFlag: 'metShrineKeeper',
    dialogueAlt: SHRINE_KEEPER_DIALOGUE_ALT,
  },
];
