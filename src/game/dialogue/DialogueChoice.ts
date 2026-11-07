// ─── Dialogue Choice ────────────────────────────────────────────────────────

export interface DialogueChoice {
  label: string;
  nextNodeId: string;
  /** A consequence the scene carries out, such as setting a story flag. */
  effect?: string;
}
