// ─── Story Chapters ─────────────────────────────────────────────────────────

export enum ChapterId {
  CHAPTER_1 = 'CHAPTER_1',
  CHAPTER_2 = 'CHAPTER_2',
  CHAPTER_3 = 'CHAPTER_3',
  CHAPTER_4 = 'CHAPTER_4',
  CHAPTER_5 = 'CHAPTER_5',
  CHAPTER_6 = 'CHAPTER_6',
  CHAPTER_7 = 'CHAPTER_7',
  CHAPTER_8 = 'CHAPTER_8',
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
  [ChapterId.CHAPTER_5]: { id: ChapterId.CHAPTER_5, number: 'V',        title: 'The Drowned Village' },
  [ChapterId.CHAPTER_6]: { id: ChapterId.CHAPTER_6, number: 'VI',       title: 'The Bamboo Labyrinth' },
  [ChapterId.CHAPTER_7]: { id: ChapterId.CHAPTER_7, number: 'VII',      title: 'The Burning Temple' },
  [ChapterId.CHAPTER_8]: { id: ChapterId.CHAPTER_8, number: 'VIII',     title: 'The Gate Itself' },
  [ChapterId.EPILOGUE]:  { id: ChapterId.EPILOGUE,  number: 'EPILOGUE', title: 'Dawn' },
};
