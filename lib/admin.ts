import type { RowDataPacket } from 'mysql2'
import { pool } from './db'
import { getDb } from './mongo'

export type AdminStats = {
  totals: { users: number; auctions: number; bids: number; revenue: number; aboveAvgStart: number }
  usersByRole: { role: string; count: number }[]
  auctionsByStatus: { status: string; count: number }[]
  categories: { name: string; auctions: number; bids: number }[]
  topBidders: { name: string; bids: number; highest: number }[]
  sellers: { name: string; sold: number; revenue: number }[]
  mongo: {
    available: boolean
    notificationsByType: { type: string; total: number; unread: number }[]
    topTags: { tag: string; auctions: number }[]
  }
}

async function rows(sql: string) {
  const [r] = await pool.query<RowDataPacket[]>(sql)
  return r
}

export async function getAdminStats(): Promise<AdminStats> {
  // ---------- MySQL: aggregate queries ----------

  // aggregate functions + a subquery (auctions that start above the average starting price)
  const [t] = await rows(`
    SELECT (SELECT COUNT(*) FROM Users)    AS users,
           (SELECT COUNT(*) FROM Auctions) AS auctions,
           (SELECT COUNT(*) FROM Bids)     AS bids,
           (SELECT IFNULL(SUM(Amount), 0) FROM Payments) AS revenue,
           (SELECT COUNT(*) FROM Auctions
             WHERE StartingPrice > (SELECT AVG(StartingPrice) FROM Auctions)) AS aboveAvgStart`)

  // GROUP BY
  const usersByRole = await rows(`SELECT Role AS role, COUNT(*) AS count FROM Users GROUP BY Role ORDER BY count DESC`)
  const auctionsByStatus = await rows(`SELECT Status AS status, COUNT(*) AS count FROM Auctions GROUP BY Status ORDER BY count DESC`)

  // LEFT JOIN + GROUP BY: every category, even ones with no auctions
  const categories = await rows(`
    SELECT c.CategoryName AS name,
           COUNT(DISTINCT a.AuctionID) AS auctions,
           COUNT(b.BidID)              AS bids
      FROM Categories c
      LEFT JOIN Auctions a ON a.CategoryID = c.CategoryID
      LEFT JOIN Bids b     ON b.AuctionID  = a.AuctionID
     GROUP BY c.CategoryID, c.CategoryName
     ORDER BY bids DESC, auctions DESC`)

  // GROUP BY + HAVING: only bidders with at least 2 bids
  const topBidders = await rows(`
    SELECT u.Name AS name, COUNT(*) AS bids, MAX(b.BidAmount) AS highest
      FROM Bids b JOIN Users u ON u.UserID = b.BidderID
     GROUP BY u.UserID, u.Name
    HAVING COUNT(*) >= 2
     ORDER BY bids DESC, highest DESC
     LIMIT 5`)

  // JOIN of three tables + SUM: what each seller has sold
  const sellers = await rows(`
    SELECT u.Name AS name, COUNT(p.PaymentID) AS sold, SUM(p.Amount) AS revenue
      FROM Users u
      JOIN Auctions a ON a.SellerID = u.UserID
      JOIN Payments p ON p.AuctionID = a.AuctionID
     GROUP BY u.UserID, u.Name
     ORDER BY revenue DESC`)

  // ---------- MongoDB: aggregation pipelines ----------
  const mongo: AdminStats['mongo'] = { available: true, notificationsByType: [], topTags: [] }
  try {
    const db = await getDb()

    // how many notifications of each type, and how many are still unread
    const byType = await db.collection('notifications').aggregate([
      { $group: { _id: '$type', total: { $sum: 1 }, unread: { $sum: { $cond: ['$unread', 1, 0] } } } },
      { $sort: { total: -1 } },
    ]).toArray()
    mongo.notificationsByType = byType.map((d) => ({ type: String(d._id), total: d.total, unread: d.unread }))

    // most used tags across auction_details: $unwind splits the tags array into one row per tag
    const tags = await db.collection('auction_details').aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', auctions: { $sum: 1 } } },
      { $sort: { auctions: -1, _id: 1 } },
      { $limit: 8 },
    ]).toArray()
    mongo.topTags = tags.map((d) => ({ tag: String(d._id), auctions: d.auctions }))
  } catch (err) {
    console.error('MongoDB unavailable for the dashboard:', (err as Error).message)
    mongo.available = false
  }

  return {
    totals: {
      users: t.users, auctions: t.auctions, bids: t.bids,
      revenue: Number(t.revenue), aboveAvgStart: t.aboveAvgStart,
    },
    usersByRole: usersByRole.map((r) => ({ role: r.role, count: r.count })),
    auctionsByStatus: auctionsByStatus.map((r) => ({ status: r.status, count: r.count })),
    categories: categories.map((r) => ({ name: r.name, auctions: r.auctions, bids: r.bids })),
    topBidders: topBidders.map((r) => ({ name: r.name, bids: r.bids, highest: Number(r.highest) })),
    sellers: sellers.map((r) => ({ name: r.name, sold: r.sold, revenue: Number(r.revenue) })),
    mongo,
  }
}
