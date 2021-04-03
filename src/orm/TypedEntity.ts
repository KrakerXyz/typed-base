
export { FilterQuery, ReplaceOneOptions } from 'mongodb';
import type { FilterQuery, ReplaceOneOptions } from 'mongodb';
import { Cleaner } from './Cleaner';

import { getCollectionAsync } from './Client';
import { EntityConfig } from './EntityConfig';

export class TypedEntity<T extends { id: string } & Record<string, any>> {

   private readonly _config: EntityConfig;
   private readonly _cleaner: Cleaner<T>;

   public constructor(readonly config?: EntityConfig) {
      if (!config) { throw new Error('TypedEntity was instantiated without a config'); }
      this._config = config!;
      this._cleaner = new Cleaner<T>(config!.fields);
   }

   public async findOneAsync(query: FilterQuery<T>): Promise<T | null> {
      const col = await getCollectionAsync(this._config.name);
      const r = await col.findOne(query);
      if (!r) { return null; }
      return this._cleaner.clean(r);
   }

   public async *findAsync(query: FilterQuery<T>): AsyncGenerator<T, void, void> {
      const col = await getCollectionAsync(this._config.name);
      const results = col.find(query)
      for await (const r of results) {
         const cleaned = this._cleaner.clean(r);
         yield cleaned;
      }
   }

   public async insert(...docs: T[]) {
      const col = await getCollectionAsync(this._config.name);
      if (docs.length === 1) {
         await col.insertOne(this._cleaner.clean(docs[0]));
      } else {
         await col.insertMany(docs.map(d => this._cleaner.clean(d)));
      }
   }

   public async replace(doc: T, options?: ReplaceOneOptions) {
      const col = await getCollectionAsync(this._config.name);
      await col.replaceOne({ id: doc.id }, this._cleaner.clean(doc), options);
   }

   public async delete(id: string): Promise<void> {
      const col = await getCollectionAsync(this._config.name);
      await col.deleteOne({ id });
   }

}
