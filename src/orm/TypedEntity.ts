
export { Filter, ReplaceOptions, UpdateOptions, FindOptions } from 'mongodb';
import { Filter, Document, ReplaceOptions, FindCursor, UpdateOptions, FindOptions, UpdateFilter } from 'mongodb';
import { Cleaner } from './Cleaner';

import { getCollectionAsync } from './Client';
import { EntityConfig } from './EntityConfig';

export class TypedEntity<T extends { id: string } & Record<string, any>> {

   private readonly _config: EntityConfig;
   private readonly _cleaner: Cleaner<T>;

   public constructor(readonly config?: EntityConfig) {
      if (!config) { throw new Error('TypedEntity was instantiated without a config. Ensure you compiled using ttsc.'); }
      this._config = config!;
      this._cleaner = new Cleaner<T>(config!.fields);
   }

   public async findOneAsync(query: Filter<T>): Promise<T | null> {
      const col = await getCollectionAsync(this._config.name);
      const r = await col.findOne(query);
      if (!r) { return null; }
      return this._cleaner.clean(r);
   }

   public async *find(query: Filter<T>, modify?: (cur: FindCursor<T>) => FindCursor<{ [k in keyof Partial<T>]: any }>, options?: FindOptions<T>): AsyncGenerator<T, void, void> {
      const col = await getCollectionAsync(this._config.name);
      if (!modify) { modify = (c) => c; }
      const results = modify(col.find<T>(query, options));
      for await (const r of results) {
         const cleaned = this._cleaner.clean(r);
         yield cleaned;
      }
   }

   public async insertAsync(...docs: T[]): Promise<void> {
      const col = await getCollectionAsync(this._config.name);
      if (docs.length === 1) {
         await col.insertOne(this._cleaner.clean(docs[0]));
      } else {
         await col.insertMany(docs.map(d => this._cleaner.clean(d)));
      }
   }

   public async replaceOneAsync(doc: T, options?: ReplaceOptions): Promise<void> {
      const col = await getCollectionAsync(this._config.name);
      await col.replaceOne({ id: doc.id }, this._cleaner.clean(doc), options ?? {});
   }

   public async updateOne(filter: Filter<T>, doc: UpdateFilter<T>, options?: UpdateOptions): Promise<void> {
      const col = await getCollectionAsync(this._config.name);
      await col.updateOne(filter as Filter<Document>, doc, options ?? {});
   }

   public async deleteAsync(query: Filter<T>): Promise<void> {
      const col = await getCollectionAsync(this._config.name);
      await col.deleteMany(query as any as Filter<Document>);
   }

   public async deleteOneAsync(id: string): Promise<void> {
      const col = await getCollectionAsync(this._config.name);
      await col.deleteOne({ id });
   }

}
