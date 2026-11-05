'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Clock3, Heart, Search, SlidersHorizontal, Tag, TrendingUp } from 'lucide-react'
import Header from '@/components/Header'
import { getAuctions } from '@/lib/api'
import type { Auction, AuctionStatus } from '@/lib/types'

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`
const statusStyle = { Live: 'status-live', Scheduled: 'status-scheduled', Closed: 'status-closed', Cancelled: 'status-cancelled' }
const STATUSES: AuctionStatus[] = ['Live', 'Scheduled', 'Closed']
const MAX_PRICE = 100000

function timeLeft(date: string) {
  const ms = new Date(date).getTime() - Date.now()
  if (ms <= 0) return 'Ended'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor(ms / 60000) % 60
  return h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${m}m left`
}

function Countdown({ date }: { date: string }) {
  const [text, setText] = useState('Calculating…')
  useEffect(() => {
    const update = () => setText(timeLeft(date))
    update()
    const interval = window.setInterval(update, 30000)
    return () => window.clearInterval(interval)
  }, [date])
  const urgent = text.includes('Ended') || text.startsWith('0h')
  return <span className={`countdown ${urgent ? 'urgent' : ''}`}><Clock3 size={13} /> {text}</span>
}

function AuctionCard({ auction, onWatch }: { auction: Auction; onWatch: (id: number) => void }) {
  const current = auction.currentPrice ?? auction.startingPrice
  const bidCount = auction.bidCount ?? auction.bids.length
  return (
    <Link href={`/auctions/${auction.id}`} className="auction-card">
      <div className="card-image">
        <img src={auction.image} alt="" />
        <span className={`status ${statusStyle[auction.status]}`}>{auction.status === 'Live' && <i />}{auction.status}</span>
        <button className="heart-btn" aria-label={`Watch ${auction.itemName}`} onClick={(e) => { e.preventDefault(); onWatch(auction.id) }}><Heart size={17} /></button>
        <div className="image-shade" />
      </div>
      <div className="card-content">
        <div className="card-kicker"><span>{auction.category}</span><Countdown date={auction.endTime} /></div>
        <h3>{auction.itemName}</h3>
        <small style={{ display: 'block', margin: '-10px 0 14px', color: '#64748b', fontSize: 11 }}>by {auction.sellerName}</small>
        <div className="price-row">
          <div><small>{bidCount > 0 ? 'Current bid' : 'Starting price'}</small><strong>{money(current)}</strong></div>
          <div className="bid-count"><TrendingUp size={14} /> {bidCount} bids</div>
        </div>
      </div>
    </Link>
  )
}

type Filters = {
  category: string; setCategory: (v: string) => void
  statuses: AuctionStatus[]; toggleStatus: (s: AuctionStatus) => void
  maxPrice: number; setMaxPrice: (n: number) => void
  endingSoon: boolean; setEndingSoon: (b: boolean) => void
  clear: () => void
}

function Sidebar({ auctions, f }: { auctions: Auction[]; f: Filters }) {
  const categories = Array.from(new Set(auctions.map((a) => a.category))).sort()
  return (
    <aside className="filters">
      <div className="filter-title"><b>Filter auctions</b><button className="clear" onClick={f.clear}>Clear all</button></div>
      <div className="filter-group">
        <label>Categories</label>
        {categories.map((c) => (
          <label className="check" key={c}>
            <input type="checkbox" checked={f.category === c} onChange={() => f.setCategory(f.category === c ? '' : c)} />
            <span>{c}</span><em>{auctions.filter((a) => a.category === c).length}</em>
          </label>
        ))}
      </div>
      <div className="filter-group">
        <label>Status</label>
        {STATUSES.map((s) => (
          <label className="check" key={s}>
            <input type="checkbox" checked={f.statuses.includes(s)} onChange={() => f.toggleStatus(s)} />
            <span>{s}</span>
          </label>
        ))}
      </div>
      <div className="filter-group">
        <label>Price range</label>
        <div className="range-label"><span>₹0</span><span>{f.maxPrice >= MAX_PRICE ? '₹1,00,000+' : money(f.maxPrice)}</span></div>
        <input className="range" type="range" min="0" max={MAX_PRICE} step="1000" value={f.maxPrice} onChange={(e) => f.setMaxPrice(Number(e.target.value))} />
      </div>
      <label className="switch-row">
        <span>Ending soon</span>
        <input type="checkbox" checked={f.endingSoon} onChange={(e) => f.setEndingSoon(e.target.checked)} />
        <span className="switch" style={f.endingSoon ? { background: '#f59e0b' } : undefined} />
      </label>
    </aside>
  )
}

export default function Page() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [statuses, setStatuses] = useState<AuctionStatus[]>([])
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE)
  const [endingSoon, setEndingSoon] = useState(false)
  const [sort, setSort] = useState('Ending soonest')
  const [watched, setWatched] = useState<number[]>([])

  useEffect(() => {
    getAuctions()
      .then(setAuctions)
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const now = Date.now()
    const price = (a: Auction) => a.currentPrice ?? a.startingPrice
    const q = query.toLowerCase()
    const rank = (a: Auction) => (a.status === 'Live' ? 0 : a.status === 'Scheduled' ? 1 : 2)
    const list = auctions.filter((a) =>
      (!category || a.category === category) &&
      (statuses.length === 0 || statuses.includes(a.status)) &&
      (maxPrice >= MAX_PRICE || price(a) <= maxPrice) &&
      (!endingSoon || (a.status === 'Live' && new Date(a.endTime).getTime() - now < 24 * 3600000)) &&
      `${a.itemName} ${a.description} ${a.category}`.toLowerCase().includes(q)
    )
    if (sort === 'Price low to high') list.sort((a, b) => price(a) - price(b))
    else if (sort === 'Price high to low') list.sort((a, b) => price(b) - price(a))
    else if (sort === 'Most bids') list.sort((a, b) => (b.bidCount ?? 0) - (a.bidCount ?? 0))
    else if (sort === 'Newest') list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    else list.sort((a, b) => rank(a) - rank(b) || new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
    return list
  }, [auctions, category, statuses, maxPrice, endingSoon, query, sort])

  const filters: Filters = {
    category, setCategory, statuses, maxPrice, setMaxPrice, endingSoon, setEndingSoon,
    toggleStatus: (s) => setStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])),
    clear: () => { setCategory(''); setStatuses([]); setMaxPrice(MAX_PRICE); setEndingSoon(false); setQuery('') },
  }
  const onWatch = (id: number) => setWatched((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]))

  return (
    <>
      <Header />
      <main>
        <section id="how" className="hero">
          <div className="hero-inner">
            <div className="eyebrow"><span className="live-pulse" /> LIVE MARKETPLACE <span className="eyebrow-line" /> Curated. Competitive. Yours.</div>
            <h1>Find something<br /><em>worth winning.</em></h1>
            <p>Discover exceptional pieces and make your next winning bid.</p>
            <div className="search-box">
              <Search size={19} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search auctions, items or categories..." />
              <button>Search</button>
            </div>
            <div className="hero-stats">
              <span><b>{auctions.filter((a) => a.status === 'Live').length}</b> live auctions</span>
              <span><b>{auctions.reduce((n, a) => n + (a.bidCount ?? 0), 0)}</b> bids placed</span>
              <span><b>{new Set(auctions.map((a) => a.sellerId)).size}</b> sellers</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="hero-card"><Tag size={18} /><span>Curated picks</span><b>Bid with confidence.</b><small>Verified items from trusted sellers.</small></div>
          </div>
        </section>
        <section id="about" className="catalog">
          <div className="section-heading">
            <div>
              <div className="eyebrow dark">EXPLORE THE MARKET</div>
              <h2>Auctions worth watching</h2>
              <p>{loading ? 'Loading…' : `${filtered.length} pieces matched your search`}</p>
            </div>
            <div className="sort-control">
              <SlidersHorizontal size={16} />
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option>Ending soonest</option><option>Newest</option><option>Price low to high</option><option>Price high to low</option><option>Most bids</option>
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
          <div className="catalog-layout">
            <Sidebar auctions={auctions} f={filters} />
            <div className="auction-grid">
              {loadError && <p style={{ color: '#b91c1c', gridColumn: '1 / -1' }}>Could not load auctions: {loadError}</p>}
              {!loading && !loadError && filtered.length === 0 && <p style={{ color: '#64748b', gridColumn: '1 / -1' }}>No auctions match these filters.</p>}
              {filtered.map((a) => <AuctionCard auction={a} key={a.id} onWatch={onWatch} />)}
            </div>
          </div>
        </section>
      </main>
      <footer><span className="brand">Bid<span>Hub</span></span><span>BidHub — DBMS Level 3 Project</span><span>Built for better auctions.</span></footer>
    </>
  )
}