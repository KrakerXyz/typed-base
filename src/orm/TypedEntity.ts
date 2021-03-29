import { EntityConfig } from './EntityConfig';

export class TypedEntity<T> {

   private readonly _config: EntityConfig;

   public constructor(readonly config?: EntityConfig) {
      if (!config) { throw new Error('TypedEntity was instantiated without a config'); }
      this._config = config!;
   }

}