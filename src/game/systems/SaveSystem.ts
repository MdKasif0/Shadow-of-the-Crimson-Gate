export class SaveSystem {
  private static readonly SAVE_KEY = 'sotcg_save';

  public static saveGame(data: any): void {
    localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
  }

  public static loadGame(): any | null {
    const data = localStorage.getItem(this.SAVE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  }
}
