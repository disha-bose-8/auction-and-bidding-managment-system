import type { RowDataPacket } from 'mysql2'
import { getDb } from './mongo'
import { pool } from './db'
import type { Notification } from './types'

// One document per notification in the MongoDB collection `notifications`.
// Notifications are small, append-only and different per type, which is why they live in MongoDB and not in MySQL.
type NotificationDoc = {
  userId: number
  type: Notification['type']
  title: string
  description: string
  auctionId: number
  unread: boolean
  createdAt: Date
}

const money = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`

function ago(d: Date) {
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`
  return `${Math.floor(s / 86400)} days ago`
}

async function col() {
  const c = (await getDb()).collection<NotificationDoc>('notifications')
  await c.createIndex({ userId: 1, createdAt: -1 }) // the bell always asks "latest for this user"
  return c
}

// Called by the bid route when someone is outbid. Never throws: a MongoDB problem must not break bidding.
export async function notifyOutbid(userId: number, auctionId: number, itemName: string, amount: number) {
  try {
    await (await col()).insertOne({
      userId,
      type: 'outbid',
      title: 'You were outbid',
      description: `Someone placed ${money(amount)} on ${itemName}. Bid again to stay in the lead.`,
      auctionId,
      unread: true,
      createdAt: new Date(),
    })
  } catch (err) {
    console.error('Could not save outbid notification:', (err as Error).message)
  }
}

// Winning and ending happen inside MySQL (a scheduled event closes the auction), and MySQL cannot write to MongoDB.
// So when someone opens the bell, we look for recent results in MySQL and add any notification that is still missing.
// The upsert with $setOnInsert makes this safe to run many times: each result is added once and "unread" is never reset.
async function addResultNotifications(userId: number) {
  const c = await col()

  const [won] = await pool.query<RowDataPacket[]>(
    `SELECT a.AuctionID, a.ItemName, a.EndTime, p.Amount
       FROM Payments p JOIN Auctions a ON a.AuctionID = p.AuctionID
      WHERE p.BuyerID = ? AND a.EndTime > NOW() - INTERVAL 7 DAY`,
    [userId]
  )
  for (const r of won) {
    await c.updateOne(
      { userId, type: 'won', auctionId: r.AuctionID },
      { $setOnInsert: { userId, type: 'won', auctionId: r.AuctionID, title: 'Auction won',
          description: `You won ${r.ItemName} for ${money(r.Amount)}. Payment is pending.`,
          unread: true, createdAt: new Date(r.EndTime) } },
      { upsert: true }
    )
  }

  const [ended] = await pool.query<RowDataPacket[]>(
    `SELECT a.AuctionID, a.ItemName, a.EndTime, p.Amount
       FROM Auctions a LEFT JOIN Payments p ON p.AuctionID = a.AuctionID
      WHERE a.SellerID = ? AND a.Status = 'Closed' AND a.EndTime > NOW() - INTERVAL 7 DAY`,
    [userId]
  )
  for (const r of ended) {
    const text = r.Amount != null
      ? `${r.ItemName} sold for ${money(r.Amount)}.`
      : `${r.ItemName} ended without a sale.`
    await c.updateOne(
      { userId, type: 'ended', auctionId: r.AuctionID },
      { $setOnInsert: { userId, type: 'ended', auctionId: r.AuctionID, title: 'Your auction ended',
          description: text, unread: true, createdAt: new Date(r.EndTime) } },
      { upsert: true }
    )
  }
}

export async function listNotifications(userId: number): Promise<Notification[]> {
  try {
    await addResultNotifications(userId).catch((e) => console.error(e))
    const docs = await (await col()).find({ userId }).sort({ createdAt: -1 }).limit(20).toArray()
    return docs.map((d) => ({
      id: String((d as unknown as { _id: unknown })._id),
      type: d.type,
      title: d.title,
      description: d.description,
      unread: d.unread,
      time: ago(d.createdAt),
    }))
  } catch (err) {
    console.error('MongoDB unavailable, no notifications:', (err as Error).message)
    return []
  }
}

export async function markAllRead(userId: number) {
  await (await col()).updateMany({ userId, unread: true }, { $set: { unread: false } })
}
