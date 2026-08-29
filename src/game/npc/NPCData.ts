import { DialogueNode } from '../dialogue/DialogueNode';
import { StoryFlags } from '../story/StoryFlag';

export interface NPCDialogueData {
  condition: (flags: StoryFlags) => boolean;
  dialogue: DialogueNode[];
}

export interface NPCDef {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  interactRadius: number;
  modelType: string;
  dialogues: NPCDialogueData[]; // Evaluated top to bottom
}

// ─── Shrine Keeper Dialogues ────────────────────────────────────────────────
const SK_POST_CAMPAIGN: DialogueNode[] = [
  { id: 'sk_end_1', speaker: 'Shrine Keeper', text: 'The air... it is clean again. You have done the impossible, ronin.' }
];

const SK_PRE_BOSS: DialogueNode[] = [
  { id: 'sk_boss_1', speaker: 'Shrine Keeper', text: 'The Crimson Gate is open. Ensure your spirit is ready before you enter. The Oni waits for no one.' }
];

const SK_POST_COURTYARD: DialogueNode[] = [
  { id: 'sk_mid_1', speaker: 'Shrine Keeper', text: 'You have cleared the courtyard. The old torii gate to the forest stands open now.', next: 'sk_mid_2' },
  { id: 'sk_mid_2', speaker: 'Shrine Keeper', text: 'Activate the shrine ahead. It will anchor your spirit should you fall.' }
];

const SK_DEFAULT: DialogueNode[] = [
  { id: 'sk_1', speaker: 'Shrine Keeper', text: 'You should not have come here, wanderer. The mountain has fallen silent.', next: 'sk_2' },
  { id: 'sk_2', speaker: 'Shrine Keeper', text: 'A darkness crept from the temple three days ago. The Crimson Oni... it has awakened.', next: 'sk_3' },
  { id: 'sk_3', speaker: 'Shrine Keeper', text: 'The yokai now prowl the forest paths. The shrine\'s barrier weakens with each passing hour.', next: 'sk_4' },
  { id: 'sk_4', speaker: 'Shrine Keeper', text: 'If you would save this place... purify the corrupted courtyard first.', next: 'sk_5' },
  { id: 'sk_5', speaker: 'Shrine Keeper', text: 'Be careful. The deeper you go, the stronger the corruption becomes.' }
];

export const NPC_DATABASE: NPCDef[] = [
  {
    id: 'shrine_keeper',
    name: 'Shrine Keeper',
    position: { x: 3, y: 0, z: 25 },
    interactRadius: 4,
    modelType: 'SHRINE_KEEPER',
    dialogues: [
      { condition: (flags) => flags.completedCampaign, dialogue: SK_POST_CAMPAIGN },
      { condition: (flags) => flags.shrineActivated && !flags.crimsonOniDefeated, dialogue: SK_PRE_BOSS },
      { condition: (flags) => flags.courtyardPurified && !flags.shrineActivated, dialogue: SK_POST_COURTYARD },
      { condition: () => true, dialogue: SK_DEFAULT }
    ]
  },
];
