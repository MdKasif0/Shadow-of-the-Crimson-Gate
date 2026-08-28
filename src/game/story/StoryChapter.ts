// ─── Story Chapters ─────────────────────────────────────────────────────────

export enum ChapterId {
  CHAPTER_1 = 'CHAPTER_1',
  CHAPTER_2 = 'CHAPTER_2',
  CHAPTER_3 = 'CHAPTER_3',
  CHAPTER_4 = 'CHAPTER_4',
  EPILOGUE = 'EPILOGUE',
}

export interface ChapterDef {
  id: ChapterId;
  number: string;     // "I", "II", etc.
  title: string;
}

export const CHAPTERS: Record<ChapterId, ChapterDef> = {
  [ChapterId.CHAPTER_1]: { id: ChapterId.CHAPTER_1, number: 'I',        title: 'The Silent Gate' },
  [ChapterId.CHAPTER_2]: { id: ChapterId.CHAPTER_2, number: 'II',       title: 'Whispers in the Forest' },
  [ChapterId.CHAPTER_3]: { id: ChapterId.CHAPTER_3, number: 'III',      title: 'The Cursed Shrine' },
  [ChapterId.CHAPTER_4]: { id: ChapterId.CHAPTER_4, number: 'IV',       title: 'Crimson Gate' },
  [ChapterId.EPILOGUE]:  { id: ChapterId.EPILOGUE,  number: 'EPILOGUE', title: 'Dawn' },
};
