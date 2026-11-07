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
  /** Whether the character is in the world right now. Always, if left out. */
  isPresent?: (flags: StoryFlags) => boolean;
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

const SK_PRE_BOSS_COLD: DialogueNode[] = [
  { id: 'sk_boss_c1', speaker: 'Shrine Keeper', text: 'The gate is open. You have been paid, ronin. See that the mountain gets what it paid for.' }
];

const SK_AFTER_TRUST: DialogueNode[] = [
  { id: 'sk_t_1', speaker: 'Shrine Keeper', text: 'The bell will steady your guard. Raise your blade the moment a blow comes, and nothing will get through.' }
];

const SK_AFTER_PAY: DialogueNode[] = [
  { id: 'sk_p_1', speaker: 'Shrine Keeper', text: 'You have your essence. The courtyard will not cleanse itself.' }
];

const SK_DEFAULT: DialogueNode[] = [
  { id: 'sk_1', speaker: 'Shrine Keeper', text: 'You should not have come here, wanderer. The mountain has fallen silent.', next: 'sk_2' },
  { id: 'sk_2', speaker: 'Shrine Keeper', text: 'A darkness crept from the temple three days ago. The Crimson Oni... it has awakened.', next: 'sk_3' },
  { id: 'sk_3', speaker: 'Shrine Keeper', text: 'The yokai now prowl the forest paths. The shrine\'s barrier weakens with each passing hour.', next: 'sk_4' },
  { id: 'sk_4', speaker: 'Shrine Keeper', text: 'If you would save this place... purify the corrupted courtyard first.', next: 'sk_5' },
  {
    id: 'sk_5', speaker: 'Shrine Keeper', text: 'Be careful. The deeper you go, the stronger the corruption becomes.',
    choices: [
      { label: 'I will cleanse it. Keep the lanterns lit.', nextNodeId: 'sk_trust', effect: 'keeperTrust' },
      { label: 'And what will you pay me for it?', nextNodeId: 'sk_pay', effect: 'keeperPay' },
    ],
  },
  { id: 'sk_trust', speaker: 'Shrine Keeper', text: 'Then take this bell. It rang for the first keeper of this shrine. Raise your guard at the last moment, and let it ring for you.' },
  { id: 'sk_pay', speaker: 'Shrine Keeper', text: '...Sixty measures of essence. It is all the shrine has left. I hope it buys you a steady hand.' },
];

// ─── Akane, a ronin with her own reasons for climbing ───────
const AKANE_COURTYARD: DialogueNode[] = [
  { id: 'ak_c1', speaker: '???', text: 'Not bad. I watched the whole thing from the wall.', next: 'ak_c2' },
  {
    id: 'ak_c2', speaker: 'Akane', text: 'Akane. I came up this mountain for the same reason you did, I expect. The Oni owes me a brother.',
    choices: [
      { label: 'Then we hunt it together.', nextNodeId: 'ak_c3a', effect: 'akaneMet' },
      { label: 'Stay out of my way.', nextNodeId: 'ak_c3b', effect: 'akaneMet' },
    ],
  },
  { id: 'ak_c3a', speaker: 'Akane', text: 'Hah. Prove you can survive the forest first. I will be watching.' },
  { id: 'ak_c3b', speaker: 'Akane', text: 'Gladly. Try not to die before the gate.' },
];

const AKANE_COURTYARD_AGAIN: DialogueNode[] = [
  { id: 'ak_ca1', speaker: 'Akane', text: 'The forest is where the shadows thicken. Watch the places you cannot see.' },
];

const AKANE_FOREST: DialogueNode[] = [
  { id: 'ak_f1', speaker: 'Akane', text: 'Don\'t look at me like that. A tengu caught me off guard.', next: 'ak_f2' },
  {
    id: 'ak_f2', speaker: 'Akane', text: 'My spirit is spent. I can barely hold my sword.',
    choices: [
      { label: 'Share what essence you can spare (up to 40).', nextNodeId: 'ak_f3a', effect: 'akaneShare' },
      { label: 'Rest here. I will go on alone.', nextNodeId: 'ak_f3b' },
    ],
  },
  { id: 'ak_f3a', speaker: 'Akane', text: '...You are a strange ronin. I will not forget this.' },
  { id: 'ak_f3b', speaker: 'Akane', text: 'Then go. I will find my own way up.' },
];

const AKANE_FOREST_AGAIN: DialogueNode[] = [
  { id: 'ak_fa1', speaker: 'Akane', text: 'Go on. The temple is close.' },
];

const AKANE_GATE_TRUSTED: DialogueNode[] = [
  { id: 'ak_g1', speaker: 'Akane', text: 'I am whole again, thanks to you. The Oni is beyond that gate. My brother\'s blade is in there too.', next: 'ak_g2' },
  {
    id: 'ak_g2', speaker: 'Akane', text: 'I owe you. Say the word and I fight at your side.',
    choices: [
      { label: 'Fight beside me.', nextNodeId: 'ak_g3a', effect: 'akaneAlly' },
      { label: 'This is my burden to carry.', nextNodeId: 'ak_g3b', effect: 'akaneRefuse' },
    ],
  },
  { id: 'ak_g3a', speaker: 'Akane', text: 'Then I will strike from the shadows whenever it falters. Don\'t make me save you twice.' },
  { id: 'ak_g3b', speaker: 'Akane', text: '...As you wish. I will keep the yokai off your back from out here.' },
];

const AKANE_GATE: DialogueNode[] = [
  { id: 'ak_gn1', speaker: 'Akane', text: 'So you made it. I am in no state to face that thing. Go, before the gate closes again.' },
];

const AKANE_READY: DialogueNode[] = [
  { id: 'ak_r1', speaker: 'Akane', text: 'I am ready when you are.' },
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
      { condition: (flags) => flags.shrineActivated && !flags.crimsonOniDefeated && flags.keeperPaid, dialogue: SK_PRE_BOSS_COLD },
      { condition: (flags) => flags.shrineActivated && !flags.crimsonOniDefeated, dialogue: SK_PRE_BOSS },
      { condition: (flags) => flags.courtyardPurified && !flags.shrineActivated, dialogue: SK_POST_COURTYARD },
      { condition: (flags) => flags.keeperTrusted, dialogue: SK_AFTER_TRUST },
      { condition: (flags) => flags.keeperPaid, dialogue: SK_AFTER_PAY },
      { condition: () => true, dialogue: SK_DEFAULT }
    ]
  },
  {
    id: 'akane_courtyard',
    name: 'Akane',
    position: { x: -5, y: 0, z: 7 },
    interactRadius: 3.5,
    modelType: 'RIVAL',
    isPresent: (flags) => flags.courtyardPurified && !flags.forestPurified,
    dialogues: [
      { condition: (flags) => flags.akaneMet, dialogue: AKANE_COURTYARD_AGAIN },
      { condition: () => true, dialogue: AKANE_COURTYARD },
    ]
  },
  {
    id: 'akane_forest',
    name: 'Akane',
    position: { x: 6, y: 0, z: -48 },
    interactRadius: 3.5,
    modelType: 'RIVAL_WOUNDED',
    isPresent: (flags) => flags.forestPurified && !flags.templeReached,
    dialogues: [
      { condition: (flags) => flags.akaneTrusted, dialogue: AKANE_FOREST_AGAIN },
      { condition: () => true, dialogue: AKANE_FOREST },
    ]
  },
  {
    id: 'akane_gate',
    name: 'Akane',
    position: { x: -5, y: 0, z: -80 },
    interactRadius: 3.5,
    modelType: 'RIVAL',
    isPresent: (flags) => flags.templeReached && !flags.crimsonOniDefeated,
    dialogues: [
      { condition: (flags) => flags.akaneAlly || flags.akaneRefused, dialogue: AKANE_READY },
      { condition: (flags) => flags.akaneTrusted, dialogue: AKANE_GATE_TRUSTED },
      { condition: () => true, dialogue: AKANE_GATE },
    ]
  },
];
