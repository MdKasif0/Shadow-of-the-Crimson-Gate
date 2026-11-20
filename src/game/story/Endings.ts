import { DialogueNode } from '../dialogue/DialogueNode';
import { StoryFlags } from './StoryFlag';

/** The Oni falls, and the gate it guarded does not close. The story goes on from here. */
export const ONI_FALLS_DIALOGUE: DialogueNode[] = [
  { id: 'oni_1', speaker: 'The Crimson Gate', text: 'The Oni turns to ash, and the gate behind it should close. It does not. It opens wider, and something on the far side breathes out.', next: 'oni_2' },
  { id: 'oni_2', speaker: 'The Crimson Gate', text: 'The Oni was never the danger. It was the lock. Down the mountain, the river is rising, and the bells of the old village have started to ring.', next: 'oni_3' },
  { id: 'oni_3', speaker: 'The Crimson Gate', text: 'A new way opens beneath the gate. Step through it, or travel from any shrine.' },
];

/** At the summit, if you turned her away in the forest. */
export const AKANE_REMATCH_DIALOGUE: DialogueNode[] = [
  { id: 'akr_1', speaker: 'Akane', text: 'You again. You told me to stay out of your way. I did. I climbed alone, and I got here first.', next: 'akr_2' },
  { id: 'akr_2', speaker: 'Akane', text: 'My brother walked through that gate. If anyone is going to close it, it will be me. Draw.' },
];

export const AKANE_YIELDS_DIALOGUE: DialogueNode[] = [
  { id: 'aky_1', speaker: 'Akane', text: 'Enough. You are better than me. My brother would have liked you.', next: 'aky_2' },
  { id: 'aky_2', speaker: 'Akane', text: 'Take this. It was his. Whatever is behind that gate, cut it once for him.' },
];

/** What remains of the Maw once it falls, and the choice it offers. */
export const CRIMSON_HEART_DIALOGUE: DialogueNode[] = [
  { id: 'heart_1', speaker: 'The Heart of the Gate', text: 'Where the Maw fell, the gate’s heart still burns: a knot of crimson fire, beating in the ash.', next: 'heart_2' },
  {
    id: 'heart_2', speaker: 'The Heart of the Gate', text: 'It speaks without words. Take me, and no blade on this mountain will ever stand against you.',
    choices: [
      { label: 'Shatter the heart. Free the mountain.', nextNodeId: 'heart_purify', effect: 'endingPurify' },
      { label: 'Take its fire for yourself.', nextNodeId: 'heart_claim', effect: 'endingClaim' },
    ],
  },
  { id: 'heart_purify', speaker: 'The Heart of the Gate', text: 'The heart cracks. Fire pours upward into the night, the gate falls still, and then the night is only night.' },
  { id: 'heart_claim', speaker: 'The Heart of the Gate', text: 'The fire climbs your arm and settles behind your eyes. Behind you, the gate groans, and opens wider.' },
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
