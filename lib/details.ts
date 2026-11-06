import { getDb } from './mongo'

// One document per auction in the MongoDB collection `auction_details`.
// Specs differ by category (a phone has storage, a painting has medium), so a document fits better than SQL columns.
export type AuctionDetails = {
  auctionId: number
  images: string[]
  specifications: Record<string, string>
  tags?: string[]
}

// Fetch details for several auctions at once. Never throws: if MongoDB is down the site just shows no specs.
export async function getDetails(ids: number[]): Promise<Map<number, AuctionDetails>> {
  const map = new Map<number, AuctionDetails>()
  if (ids.length === 0) return map
  try {
    const db = await getDb()
    const docs = await db
      .collection<AuctionDetails>('auction_details')
      .find({ auctionId: { $in: ids } })
      .toArray()
    for (const d of docs) map.set(d.auctionId, d)
  } catch (err) {
    console.error('MongoDB unavailable, continuing without details:', (err as Error).message)
  }
  return map
}

// Save (or replace) the details document of one auction. Used when a seller creates an auction.
export async function saveDetails(d: AuctionDetails): Promise<void> {
  const db = await getDb()
  const col = db.collection<AuctionDetails>('auction_details')
  await col.createIndex({ auctionId: 1 }, { unique: true })
  await col.createIndex({ tags: 1 })
  await col.updateOne({ auctionId: d.auctionId }, { $set: { ...d, updatedAt: new Date() } }, { upsert: true })
}
