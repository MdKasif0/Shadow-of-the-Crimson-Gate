/**
 * ScreenPulse — Brief full-screen moments the final grade plays:
 * `spirit` for a perfect dodge (the world drains of colour and ripples
 * outward), `impact` for a heavy blow (the image splits and kicks inward).
 * Anything can kick them; the renderer eases them back to nothing.
 */
export const ScreenPulse = {
  spirit: 0,
  impact: 0,
  /** Seconds since the last dodge's ripple began. */
  spiritAge: 0,
  /** Where the ripple starts, in screen UV. */
  origin: { x: 0.5, y: 0.5 },

  kickSpirit(amount = 1): void {
    this.spirit = Math.max(this.spirit, amount);
    this.spiritAge = 0;
  },

  kickImpact(amount = 1): void {
    this.impact = Math.max(this.impact, amount);
  },
};
