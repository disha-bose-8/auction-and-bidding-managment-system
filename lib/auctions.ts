import type { RowDataPacket } from 'mysql2'
import type { Auction, AuctionStatus } from './types'
import type { AuctionDetails } from './details'

// Server-side helper: turns a row of the AuctionBoard view into the Auction shape the UI uses.

export interface BoardRow extends RowDataPacket {
  AuctionID: number
  ItemName: string
  Description: string | null
  StartingPrice: number
  ReservePrice: number | null
  StartTime: Date
  EndTime: Date
  Status: AuctionStatus
  CategoryID: number
  CategoryName: string
  SellerID: number
  SellerName: string
  CurrentPrice: number
  TotalBids: number
  SellerRating: number | null
}

// AuctionBoard (view from sql/04_patch.sql) + the seller's average rating from Feedback
export const BOARD_SQL = `
  SELECT b.*,
         (SELECT ROUND(AVG(f.Rating), 1) FROM Feedback f WHERE f.ToUserID = b.SellerID) AS SellerRating
  FROM AuctionBoard b`

const TONES = ['26345a', '795548', 'd97706', '475569', '334155', '4c1d95']

export function rowToAuction(
  r: BoardRow,
  bids: Auction['bids'] = [],
  details?: AuctionDetails // from MongoDB (images + specifications); optional
): Auction {
  return {
    id: r.AuctionID,
    itemName: r.ItemName,
    description: r.Description ?? '',
    category: r.CategoryName,
    sellerId: r.SellerID,
    sellerName: r.SellerName,
    sellerRating: r.SellerRating ?? 0,
    startingPrice: r.StartingPrice,
    reservePrice: 0, // the reserve stays secret: the client only learns whether it was met
    reserveMet: r.TotalBids > 0 && (r.ReservePrice == null || r.CurrentPrice >= r.ReservePrice),
    startTime: new Date(r.StartTime).toISOString(),
    endTime: new Date(r.EndTime).toISOString(),
    status: r.Status,
    image:
      details?.images?.[0] ??
      `https://placehold.co/900x650/${TONES[r.CategoryID % TONES.length]}/ffffff?text=${encodeURIComponent(r.ItemName)}`,
    specifications: details?.specifications ?? {},
    bids,
    currentPrice: r.CurrentPrice,
    bidCount: r.TotalBids,
  }
}