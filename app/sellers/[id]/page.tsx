'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star } from 'lucide-react'
import Header from '@/components/Header'
import { getSeller, type SellerProfile } from '@/lib/api'

const money = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const Stars = ({ value }: { value: number }) => (
  <span className="stars" style={{ margin: 0 }}>
    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill={i <= Math.round(value) ? 'currentColor' : 'none'} />)}
  </span>
)

export default function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getSeller(Number(id)).then(setSeller).catch((e: Error) => setError(e.message))
  }, [id])

  const back = <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to auctions</Link>
  if (error) return <><Header /><main className="detail-page">{back}<p style={{ color: '#b91c1c' }}>{error}</p></main></>
  if (!seller) return <><Header /><main className="detail-page"><p style={{ color: '#64748b' }}>Loading seller…</p></main></>

  return (
    <>
      <Header />
      <main className="detail-page" style={{ maxWidth: 1000 }}>
        {back}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26 }}>
          <span className="seller-avatar" style={{ width: 64, height: 64, fontSize: 26 }}>{seller.name[0]}</span>
          <div>
            <h1 style={{ fontSize: 30, letterSpacing: -1.2, margin: '0 0 8px' }}>{seller.name}</h1>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
              {seller.rating !== null
                ? <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Stars value={seller.rating} /> <b style={{ color: 'var(--ink)' }}>{seller.rating}</b> ({seller.reviewCount} reviews)</span>
                : <span>New seller, no reviews yet</span>}
              <span>{seller.itemsSold} items sold</span>
              <span>Member since {day(seller.memberSince)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 22, alignItems: 'start' }}>
          <section className="spec-card" style={{ marginTop: 0 }}>
            <div className="card-heading"><h2>Auctions</h2><span>{seller.auctions.length}</span></div>
            {seller.auctions.length === 0 && <p style={{ fontSize: 12, color: '#94a3b8' }}>No auctions yet.</p>}
            {seller.auctions.map((a) => (
              <Link key={a.id} href={`/auctions/${a.id}`} className="history-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <img src={a.image} alt="" style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover', background: '#e2e8f0' }} />
                <span><b>{a.itemName}</b><small style={{ marginTop: 3 }}>{a.status} · ends {day(a.endTime)}</small></span>
                <strong>{money(a.price)}</strong>
              </Link>
            ))}
          </section>

          <section className="spec-card" style={{ marginTop: 0 }}>
            <div className="card-heading"><h2>Reviews</h2><span>{seller.reviewCount}</span></div>
            {seller.reviews.length === 0 && <p style={{ fontSize: 12, color: '#94a3b8' }}>No reviews yet.</p>}
            {seller.reviews.map((r, i) => (
              <div key={i} style={{ borderTop: '1px solid var(--line)', padding: '13px 0', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stars value={r.rating} /><small style={{ color: '#94a3b8' }}>{day(r.date)}</small>
                </div>
                {r.comment && <p style={{ margin: '8px 0 4px', color: '#5d6b7e', lineHeight: 1.5 }}>{r.comment}</p>}
                <small style={{ color: '#94a3b8' }}>{r.from} · {r.item}</small>
              </div>
            ))}
          </section>
        </div>
      </main>
    </>
  )
}
