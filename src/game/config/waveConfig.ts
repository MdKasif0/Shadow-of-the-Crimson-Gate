export interface WaveData {
  id: number;
  enemies: {
    type: string;
    count: number;
  }[];
}

export const WAVES_CONFIG: WaveData[] = [
  {
    id: 1,
    enemies: [
      { type: 'BasicYokai', count: 5 }
    ]
  },
  {
    id: 2,
    enemies: [
      { type: 'BasicYokai', count: 6 },
      { type: 'ShadowYokai', count: 2 }
    ]
  },
  {
    id: 3,
    enemies: [
      { type: 'BasicYokai', count: 5 },
      { type: 'ShadowYokai', count: 3 },
      { type: 'Tengu', count: 1 }
    ]
  },
  {
    id: 4,
    enemies: [
      { type: 'ShadowYokai', count: 5 },
      { type: 'Tengu', count: 2 }
    ]
  },
  {
    id: 5,
    enemies: [
      { type: 'CrimsonOni', count: 1 }
    ]
  }
];
