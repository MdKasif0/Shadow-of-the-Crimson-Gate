export const DEPTH = {
  SKY: 0,
  MOUNTAINS: 10,
  DISTANT_FOG: 20,
  BACKGROUND: 30,
  MIDGROUND: 40,
  GROUND: 50,
  ENTITY_BASE: 100, // Player and enemies use ENTITY_BASE + y
  FOREGROUND_PROPS: 150,
  FOREGROUND_FOG: 200,
  PARTICLES: 250,
  LIGHTING: 300,
  HUD: 1000
};

export function getEntityDepth(y: number): number {
  return DEPTH.ENTITY_BASE + Math.round(y);
}
