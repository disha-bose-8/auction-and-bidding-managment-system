// Fills the MongoDB collection `auction_details` for the 8 demo auctions.
// Run with:  node --env-file=.env.local scripts/seed-mongo.mjs
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB ?? 'auction_bidding_system'
if (!uri) {
  console.error('MONGODB_URI is not set. Run: node --env-file=.env.local scripts/seed-mongo.mjs')
  process.exit(1)
}

const img = (label, tone) =>
  `https://placehold.co/900x650/${tone}/ffffff?text=${encodeURIComponent(label)}`

const docs = [
  { auctionId: 1, images: [img('iPhone 14 Pro', '26345a')], tags: ['phone', 'apple', 'smartphone'],
    specifications: { Condition: 'Excellent', Storage: '256 GB', Colour: 'Deep Purple', Warranty: 'Expired' } },
  { auctionId: 2, images: [img('Brass Clock', '795548')], tags: ['clock', 'vintage', 'brass'],
    specifications: { Era: '1950s', Material: 'Brass', Origin: 'Jaipur', Condition: 'Good' } },
  { auctionId: 3, images: [img('Oil Painting', 'd97706')], tags: ['painting', 'art', 'oil'],
    specifications: { Medium: 'Oil on canvas', Dimensions: '24 x 18 in', Year: '2018', Artist: 'Ananya Rao' } },
  { auctionId: 4, images: [img('Titan Edge', '475569')], tags: ['watch', 'titan', 'fashion'],
    specifications: { Brand: 'Titan', 'Strap type': 'Leather', Size: '42 mm', Warranty: '1 year' } },
  { auctionId: 5, images: [img('Gaming Laptop', '334155')], tags: ['laptop', 'gaming', 'computer'],
    specifications: { RAM: '16 GB', Storage: '1 TB SSD', GPU: 'RTX 4060', Condition: 'Like new' } },
  { auctionId: 6, images: [img('Sony WH-1000XM5', '1e3a8a')], tags: ['headphones', 'audio', 'sony'],
    specifications: { Brand: 'Sony', Type: 'Over-ear', 'Noise cancelling': 'Yes', Condition: 'Excellent' } },
  { auctionId: 7, images: [img('Royal Doulton Vase', '713f12')], tags: ['vase', 'porcelain', 'antique'],
    specifications: { Maker: 'Royal Doulton', Material: 'Porcelain', Era: '1960s', Condition: 'Good' } },
  { auctionId: 8, images: [img('Leather Satchel', '4c1d95')], tags: ['bag', 'leather', 'fashion'],
    specifications: { Material: 'Leather', Colour: 'Tan', Stitching: 'Hand-stitched', Condition: 'New' } },
]

const client = new MongoClient(uri)
try {
  await client.connect()
  const col = client.db(dbName).collection('auction_details')
  await col.createIndex({ auctionId: 1 }, { unique: true }) // one details document per auction
  await col.createIndex({ tags: 1 })                        // fast lookup by tag
  for (const d of docs) {
    await col.updateOne({ auctionId: d.auctionId }, { $set: { ...d, updatedAt: new Date() } }, { upsert: true })
  }
  console.log(`Seeded ${docs.length} documents into ${dbName}.auction_details`)
} finally {
  await client.close()
}