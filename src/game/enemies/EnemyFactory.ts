import { CharacterRig } from '../characters/CharacterRig';
import { buildBasicYokai, buildShadowYokai, buildTengu } from './EnemyModels';

export class EnemyFactory {
  public static createBasicYokai(): CharacterRig {
    return buildBasicYokai();
  }

  public static createShadowYokai(): CharacterRig {
    return buildShadowYokai();
  }

  public static createTengu(): CharacterRig {
    return buildTengu();
  }
}
