// ─── Story Events ───────────────────────────────────────────────────────────
// Event type constants for EventBus integration.

export const StoryEvents = {
  STORY_TRIGGER: 'storyTrigger',
  DIALOGUE_START: 'dialogueStart',
  DIALOGUE_END: 'dialogueEnd',
  OBJECTIVE_START: 'objectiveStart',
  OBJECTIVE_COMPLETE: 'objectiveComplete',
  CHAPTER_COMPLETE: 'chapterComplete',
  CHAPTER_START: 'chapterStart',
  INTRO_COMPLETE: 'introComplete',
} as const;
