export type Role = 'Bidder' | 'Seller' | 'Admin'
export type AuctionStatus = 'Scheduled' | 'Live' | 'Closed' | 'Cancelled'

export type User = { id: number; name: string; email: string; role: Role; rating?: number }
export type Bid = { id: number; auctionId: number; bidderId: number; bidderName: string; amount: number; time: string }
export type Auction = {
  id: number; itemName: string; description: string; category: string; sellerId: number; sellerName: string; sellerRating: number
  startingPrice: number; reservePrice: number; startTime: string; endTime: string; status: AuctionStatus
  image: string; specifications: Record<string, string>; bids: Bid[]
}
export type Notification = { id: number; type: 'outbid' | 'won' | 'payment' | 'ended'; title: string; description: string; unread: boolean; time: string }
