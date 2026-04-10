import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(MONGO_URI, {
      maxIdleTimeMS: 3000,
    });
    await global._mongoClient.connect();
  }
  return global._mongoClient;
}
