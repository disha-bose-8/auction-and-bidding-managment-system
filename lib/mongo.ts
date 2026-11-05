import { MongoClient, type Db } from 'mongodb'

// One shared connection for the whole server (re-used across requests and hot reloads).
const globalForMongo = globalThis as unknown as { _mongo?: Promise<MongoClient> }

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')

  if (!globalForMongo._mongo) {
    globalForMongo._mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 })
      .connect()
      .catch((err) => {
        globalForMongo._mongo = undefined // try again on the next request
        throw err
      })
  }
  const client = await globalForMongo._mongo
  return client.db(process.env.MONGODB_DB ?? 'auction_bidding_system')
}