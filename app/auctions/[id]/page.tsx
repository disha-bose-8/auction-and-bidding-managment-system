'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Clock3, Heart, Info, ShieldCheck, Star, TrendingUp } from 'lucide-react'
import Header from '@/components/Header'
import { getAuction, getMe, placeBid, type Me } from '@/lib/api'
import type { Auction } from '@/lib/types'

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`

function useNow(ms: number) {
  const [now, setNow] = useState(0)
  useEffect(() => {
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return now
}

function formatLeft(ms: number) {
  if (ms <= 0) return 'Ended'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, sec = s % 60
  return `${d > 0 ? `${d}d ` : ''}${h}h ${m}m ${String(sec).padStart(2, '0')}s`
}

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)} minutes ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`
  return `${Math.floor(s / 86400)} days ago`
}

export default function AuctionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const now = useNow(1000)
  const [auction, setAuction] = useState<Auction | null>(null)
  const [loadError, setLoadError] = useState('')
  const [me, setMe] = useState<Me | null>(null)
  const [amount, setAmount] = useState(0)
  const [bidError, setBidError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => getAuction(Number(id)), [id])

  useEffect(() => {
    load()
      .then((a) => {
        setAuction(a)
        setAmount((a.bidCount ?? 0) > 0 ? (a.currentPrice ?? a.startingPrice) + 500 : a.startingPrice)
      })
      .catch((e: Error) => setLoadError(e.message))
    getMe().then(setMe).catch(() => {})
  }, [load])

  if (loadError) {
    return <><Header /><main className="detail-page"><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to auctions</Link><p style={{ color: '#b91c1c' }}>{loadError}</p></main></>
  }
  if (!auction) {
    return <><Header /><main className="detail-page"><p style={{ color: '#64748b' }}>Loading auction…</p></main></>
  }

  const current = auction.currentPrice ?? auction.startingPrice
  const hasBids = auction.bids.length > 0
  const minBid = hasBids ? current + 1 : auction.startingPrice
  const live = auction.status === 'Live'
  const isOwnAuction = me?.id === auction.sellerId
  const msLeft = new Date(auction.endTime).getTime() - now

  const bid = async () => {
    setBidError('')
    setMessage('')
    if (!me) { router.push('/login'); return }
    setBusy(true)
    try {
      const result = await placeBid(auction.id, amount)
      const fresh = await load()
      setAuction(fresh)
      setAmount((fresh.currentPrice ?? fresh.startingPrice) + 500)
      setMessage(result.extended ? 'Bid placed. Auction extended by 5 minutes' : 'Bid placed successfully')
    } catch (e) {
      setBidError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Header />
      <main className="detail-page">
        <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to auctions</Link>
        <div className="detail-layout">
          <section>
            <div className="detail-image"><img src={auction.image} alt={auction.itemName} /><span className="image-label">{auction.category}</span></div>
            <div className="detail-copy">
              <div className="detail-kicker">
                <span className={`status ${live ? 'status-live' : 'status-closed'}`}>{auction.status}</span>
                <span>Lot #{String(auction.id).padStart(4, '0')}</span>
              </div>
              <h1>{auction.itemName}</h1>
              <div className="seller-line">
                <span className="seller-avatar">{auction.sellerName[0]}</span>
                <span>Sold by <b>{auction.sellerName}</b></span>
                {auction.sellerRating > 0
                  ? <span className="stars">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill="currentColor" />)} <b>{auction.sellerRating}</b></span>
                  : <span style={{ marginLeft: 8 }}>New seller</span>}
              </div>
              <p className="description">{auction.description}</p>
              {Object.keys(auction.specifications).length > 0 && (
                <div className="spec-card">
                  <div className="card-heading"><h2>Specifications</h2><span><Info size={14} /> Verified details</span></div>
                  <div className="spec-grid">{Object.entries(auction.specifications).map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
                </div>
              )}
              <div className="history">
                <div className="card-heading"><h2>Bid history <span>({auction.bids.length})</span></h2><span>All bids are verified</span></div>
                {!hasBids && <p style={{ color: '#94a3b8', fontSize: 12 }}>No bids yet. Be the first!</p>}
                {[...auction.bids].reverse().map((b, i) => (
                  <div className={`history-row ${i === 0 ? 'top-bid' : ''}`} key={b.id}>
                    <span className="bidder-avatar">{b.bidderName[0]}</span>
                    <span><b>{b.bidderName}</b><small>{ago(b.time, now)}</small></span>
                    <strong>{money(b.amount)}</strong>
                    {i === 0 && <span className="highest"><Check size={12} /> Highest</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>
          <aside className="bid-panel">
            <div className="panel-top">
              <span className="live-tag"><i /> {live ? 'LIVE AUCTION' : auction.status.toUpperCase()}</span>
              <span className="watch-action"><Heart size={16} /> Watch</span>
            </div>
            <div className="timer"><Clock3 size={18} /><div><small>Time remaining</small><b>{now ? formatLeft(msLeft) : '…'}</b></div></div>
            <div className="current-bid">
              <small>{hasBids ? 'Current highest bid' : 'Starting price'}</small>
              <strong>{money(current)}</strong>
              <span><TrendingUp size={14} /> {auction.bids.length} bids</span>
            </div>
            {hasBids && (
              <div className="reserve">
                <span className="reserve-check" style={auction.reserveMet ? undefined : { background: '#fee2e2', color: '#b91c1c' }}><Check size={13} /></span>
                <div>
                  <b style={auction.reserveMet ? undefined : { color: '#b91c1c' }}>{auction.reserveMet ? 'Reserve met' : 'Reserve not met'}</b>
                  <small>{auction.reserveMet ? "The seller's minimum is reached" : "Keep bidding to reach the seller's minimum"}</small>
                </div>
                <Info size={15} />
              </div>
            )}
            <label className="input-label">Your maximum bid <span>Minimum {money(minBid)}</span></label>
            <div className="bid-input"><span>₹</span><input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
            <div className="quick-bids">
              <button onClick={() => setAmount(current + 500)}>+ ₹500</button>
              <button onClick={() => setAmount(current + 1000)}>+ ₹1,000</button>
              <button onClick={() => setAmount(current + 5000)}>+ ₹5,000</button>
            </div>
            {bidError && <div className="inline-error">{bidError}</div>}
            {message && <div className="inline-success">{message}</div>}
            {isOwnAuction && <div className="inline-error">You can't bid on your own auction.</div>}
            <button className="place-bid" onClick={bid} disabled={!live || busy || isOwnAuction}>
              {busy ? 'Placing…' : me ? 'Place bid' : 'Log in to bid'} <span>→</span>
            </button>
            <p className="bid-note"><ShieldCheck size={14} /> By bidding, you agree to our auction terms.</p>
            <div className="anti"><Info size={14} /><span><b>Anti-sniping protection</b><br />Bids in the final 5 minutes extend the auction by 5 minutes.</span></div>
          </aside>
        </div>
      </main>
    </>
  )
}