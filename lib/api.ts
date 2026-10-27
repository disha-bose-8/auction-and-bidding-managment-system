import { auctions, notifications, users } from './mock-data'
import type { Auction, Notification, User } from './types'

export async function getAuctions(): Promise<Auction[]> { return structuredClone(auctions) }
export async function getAuction(id: number): Promise<Auction | undefined> { return structuredClone(auctions.find((auction) => auction.id === id)) }
export async function getNotifications(): Promise<Notification[]> { return structuredClone(notifications) }
export async function login(role: User['role'] = 'Bidder'): Promise<User> { return users.find((user) => user.role === role) ?? users[3] }
export async function register(data: Pick<User, 'name' | 'email' | 'role'>): Promise<User> { return { id: 99, ...data } }
export async function placeBid(auctionId: number, bidderId: number, amount: number): Promise<{ auction: Auction; extended: boolean }> {
  const auction = auctions.find((item) => item.id === auctionId)
  if (!auction) throw new Error('Auction not found')
  if (auction.status !== 'Live') throw new Error('Auction is not live')
  if (auction.sellerId === bidderId) throw new Error('Seller cannot bid on own auction')
  const current = Math.max(0, ...auction.bids.map((item) => item.amount))
  if (amount < auction.startingPrice) throw new Error('Bid is below starting price')
  if (amount <= current) throw new Error('Bid must exceed current highest bid')
  const extended = new Date(auction.endTime).getTime() - Date.now() < 5 * 60 * 1000
  auction.bids.push({ id: Date.now(), auctionId, bidderId, bidderName: users.find((u) => u.id === bidderId)?.name ?? 'Demo bidder', amount, time: 'Just now' })
  if (extended) auction.endTime = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  return { auction: structuredClone(auction), extended }
}
