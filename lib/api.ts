import { notifications } from './mock-data'
import type { Auction, Notification, Role, User } from './types'

// Every call to our own backend goes through here, so pages never touch fetch directly.
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Request failed')
  return data as T
}

export type Me = { id: number; name: string; role: Role }

// ---- auctions (MySQL) ----
export const getAuctions = () => request<Auction[]>('/api/auctions')
export const getAuction = (id: number) => request<Auction>(`/api/auctions/${id}`)
export const placeBid = (auctionId: number, amount: number) =>
  request<{ ok: boolean; extended: boolean; previousBidder: number | null }>(
    `/api/auctions/${auctionId}/bids`,
    { method: 'POST', body: JSON.stringify({ amount }) }
  )

export type Category = { id: number; name: string }
export type NewAuction = {
  itemName: string; description: string; categoryId: number
  startingPrice: number; reservePrice: number | null
  startTime: string; endTime: string
  imageUrl: string; specifications: Record<string, string>; tags: string[]
}
export const getCategories = () => request<Category[]>('/api/categories')
export const createAuction = (data: NewAuction) =>
  request<{ id: number; detailsSaved: boolean }>('/api/auctions', { method: 'POST', body: JSON.stringify(data) })

// ---- watchlist (MySQL) ----
export const getWatchlist = async (): Promise<number[]> =>
  (await request<{ ids: number[] }>('/api/watchlist')).ids
export const toggleWatch = (auctionId: number) =>
  request<{ watching: boolean }>('/api/watchlist', { method: 'POST', body: JSON.stringify({ auctionId }) })

// ---- auth ----
export const getMe = async (): Promise<Me | null> =>
  (await request<{ user: Me | null }>('/api/auth/me')).user
export const login = (email: string, password: string) =>
  request<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
export const register = (data: { name: string; phone: string; email: string; password: string; role: string }) =>
  request<{ user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) })
export const logout = () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })

// ---- notifications: still mock data until the MongoDB step ----
export async function getNotifications(): Promise<Notification[]> {
  return structuredClone(notifications)
}