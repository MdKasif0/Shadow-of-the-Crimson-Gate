import { EventBus } from '../core/EventBus';

export enum ObjectiveState {
  REACH_COURTYARD,
  CLEAR_COURTYARD,
  REACH_SHRINE,
  CLEAR_SHRINE,
  REACH_TEMPLE,
  CLEAR_TEMPLE,
  DEFEAT_BOSS,
  COMPLETED
}

export class ObjectiveManager {
  private state: ObjectiveState = ObjectiveState.REACH_COURTYARD;
  private clearedEncounters: Set<string> = new Set();
  
  constructor() {
    this.publishObjective();

    EventBus.on('encounterComplete', (data: any) => {
      this.clearedEncounters.add(data.id);
      
      if (this.state === ObjectiveState.CLEAR_COURTYARD && data.id === 'enc_courtyard') {
        this.setState(ObjectiveState.REACH_SHRINE);
      } else if (this.state === ObjectiveState.CLEAR_SHRINE && data.id === 'enc_shrine') {
        this.setState(ObjectiveState.REACH_TEMPLE);
      } else if (this.state === ObjectiveState.CLEAR_TEMPLE && data.id === 'enc_temple') {
        this.setState(ObjectiveState.COMPLETED);
      }
    });

    EventBus.on('bossDeath', () => {
      this.setState(ObjectiveState.COMPLETED);
    });
  }

  public onZoneEntered(zoneId: string): void {
    if (this.state === ObjectiveState.REACH_COURTYARD && zoneId === 'COURTYARD') {
      if (!this.clearedEncounters.has('enc_courtyard')) {
        this.setState(ObjectiveState.CLEAR_COURTYARD);
      } else {
        this.setState(ObjectiveState.REACH_SHRINE);
      }
    } else if (this.state === ObjectiveState.REACH_SHRINE && zoneId === 'SHRINE') {
      if (!this.clearedEncounters.has('enc_shrine')) {
        this.setState(ObjectiveState.CLEAR_SHRINE);
      } else {
        this.setState(ObjectiveState.REACH_TEMPLE);
      }
    } else if (this.state === ObjectiveState.REACH_TEMPLE && zoneId === 'TEMPLE_APPROACH') {
      if (!this.clearedEncounters.has('enc_temple')) {
        this.setState(ObjectiveState.CLEAR_TEMPLE);
      }
    } else if (zoneId === 'BOSS_ARENA') {
      this.setState(ObjectiveState.DEFEAT_BOSS);
    }
  }

  private setState(newState: ObjectiveState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.publishObjective();
    }
  }

  private publishObjective(): void {
    let text = "";
    switch (this.state) {
      case ObjectiveState.REACH_COURTYARD: text = "ENTER THE COURTYARD"; break;
      case ObjectiveState.CLEAR_COURTYARD: text = "PURIFY THE COURTYARD"; break;
      case ObjectiveState.REACH_SHRINE:    text = "REACH THE SHRINE"; break;
      case ObjectiveState.CLEAR_SHRINE:    text = "PURIFY THE SHRINE AREA"; break;
      case ObjectiveState.REACH_TEMPLE:    text = "CONTINUE TO THE TEMPLE"; break;
      case ObjectiveState.CLEAR_TEMPLE:    text = "DEFEAT THE TEMPLE GUARDS"; break;
      case ObjectiveState.DEFEAT_BOSS:     text = "DEFEAT THE CRIMSON ONI"; break;
      case ObjectiveState.COMPLETED:       text = "AREA CLEARED"; break;
    }
    
    EventBus.emit('objectiveUpdate', { text });
  }
}
