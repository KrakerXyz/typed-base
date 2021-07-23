import * as mongo from 'mongodb';

export interface DbConfig {
   uri: string;
   dbName: string;
   mongoClientOptions?: mongo.MongoClientOptions;
}

let _config: DbConfig | undefined;
export function configureDb(dbConfig: DbConfig) {
   _config = dbConfig;

}

function getConfig(): DbConfig {
   if (!_config) { throw new Error('Attempted DB operation without config. Ensure configureDb() has been called before initiating any DB operation.'); }
   return _config;
}

let _clients: Map<string, mongo.MongoClient> | undefined;

export async function getCollectionAsync(name: string): Promise<mongo.Collection> {
   if (!_clients) { _clients = new Map(); }
   const config = getConfig();
   let client = _clients.get(config.uri);
   if (!client) {
      client = new mongo.MongoClient(config.uri, config.mongoClientOptions);
      _clients.set(config.uri, client);
      await client.connect();
   }
   const db = client.db(config.dbName);
   const col = db.collection(name);
   return col;
}