
import { Filter, FindCursor, FindOptions, ReplaceOptions, UpdateFilter, UpdateOptions } from 'mongodb';
import { UpdateResult } from '.';
import { Cleaner } from './Cleaner';

import { getCollectionAsync } from './Client';
import { EntityConfig } from './EntityConfig';

export class TypedEntity<T extends { id: string}> {

    private readonly _config: EntityConfig;
    private readonly _cleaner: Cleaner<T>;

    public constructor(readonly config?: EntityConfig) {
        if (!config) { throw new Error('TypedEntity was instantiated without a config. Ensure you compiled using ttsc.'); }
        this._config = config!;
        this._cleaner = new Cleaner<T>(config!.fields);
    }

    public async findOneAsync(query: Filter<T>, options?: FindOptions<T>): Promise<T | null> {
        const col = await getCollectionAsync(this._config.name);
        const r = await col.findOne(query as Filter<any>, options);
        if (!r) { return null; }
        return this._cleaner.clean(r);
    }

    public async *find(query: Filter<T>, modify?: (cur: FindCursor<T>) => FindCursor<{ [k in keyof Partial<T>]: any }>, options?: FindOptions<T>): AsyncGenerator<T, void, void> {
        const col = await getCollectionAsync(this._config.name);
        if (!modify) { modify = (c) => c; }
        const results = modify(col.find<T>(query as Filter<any>, options));
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

    public async replaceOneAsync(doc: T, options?: ReplaceOptions): Promise<UpdateResult> {
        const col = await getCollectionAsync(this._config.name);
        const result = await col.replaceOne({ id: doc.id }, this._cleaner.clean(doc), options ?? {});
        return {
            updated: result.modifiedCount,
            inserted: result.upsertedCount
        };
    }

    public async updateOneAsync(filter: Filter<T>, doc: UpdateFilter<T>, options?: UpdateOptions): Promise<void> {
        const col = await getCollectionAsync(this._config.name);
        await col.updateOne(filter as Filter<any>, doc, options ?? {});
    }

    public async deleteAsync(query: Filter<T>): Promise<void> {
        const col = await getCollectionAsync(this._config.name);
        await col.deleteMany(query as Filter<any>);
    }

    public async deleteOneAsync(id: string): Promise<void> {
        const col = await getCollectionAsync(this._config.name);
        await col.deleteOne({ id });
    }

}
