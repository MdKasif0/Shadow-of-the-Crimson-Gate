import { DialogueNode } from '../dialogue/DialogueNode';
import { StoryFlags } from './StoryFlag';

/** What remains of the Oni once it falls, and the choice it offers. */
export const CRIMSON_HEART_DIALOGUE: DialogueNode[] = [
  { id: 'heart_1', speaker: 'The Crimson Heart', text: 'Where the Oni fell, its heart still burns: a knot of crimson fire, beating in the ash.', next: 'heart_2' },
  {
    id: 'heart_2', speaker: 'The Crimson Heart', text: 'It speaks without words. Take me, and no blade on this mountain will ever stand against you.',
    choices: [
      { label: 'Shatter the heart. Free the mountain.', nextNodeId: 'heart_purify', effect: 'endingPurify' },
      { label: 'Take its fire for yourself.', nextNodeId: 'heart_claim', effect: 'endingClaim' },
    ],
  },
  { id: 'heart_purify', speaker: 'The Crimson Heart', text: 'The heart cracks. Fire pours upward into the night, and then the night is only night.' },
  { id: 'heart_claim', speaker: 'The Crimson Heart', text: 'The fire climbs your arm and settles behind your eyes. Behind you, the gate groans, and opens wider.' },
];

export interface Ending {
  title: string;
  text: string;
  accent: string;
}

/** Three endings, from the choice at the heart and whether Akane fought beside you. */
export function endingFor(flags: StoryFlags): Ending {
  if (flags.endingClaim) {
    return {
      title: 'The Crimson Lord',
      text: 'The yokai bow as you pass. The gate is yours now, and so is its hunger. Somewhere below, a shrine bell stops ringing.',
      accent: '#ff5a3a',
    };
  }
  if (flags.akaneAlly) {
    return {
      title: 'Two Blades at Dawn',
      text: 'The gate stands quiet. Akane walks beside you down the mountain with her brother’s sword across her back, and for once neither of you reaches for a blade.',
      accent: '#ffcf8a',
    };
  }
  return {
    title: 'The Lone Wanderer',
    text: 'The mountain breathes again. You leave before the pilgrims return, as ronin do, and a shrine bell rings once behind you.',
    accent: '#88bbff',
  };
}
