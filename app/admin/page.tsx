'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/Header'
import { getAdminStats, getMe, type Me } from '@/lib/api'
import type { AdminStats } from '@/lib/admin'

const money = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`
const th = { textAlign: 'left', fontSize: 10, color: '#94a3b8', fontWeight: 700, padding: '8px 6px', borderBottom: '1px solid var(--line)' } as const
const td = { fontSize: 12, padding: '9px 6px', borderBottom: '1px solid var(--line)' } as const

function Card({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="spec-card" style={{ marginTop: 0 }}>
      <div className="card-heading"><h2>{title}</h2></div>
      <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 12px' }}>{note}</p>
      {children}
    </section>
  )
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <p style={{ fontSize: 12, color: '#94a3b8' }}>No data yet.</p>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{head.map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export default function AdminPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getMe()
      .then((u) => {
        setMe(u)
        if (u?.role === 'Admin') getAdminStats().then(setStats).catch((e: Error) => setError(e.message))
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  if (!ready) return <><Header /><main className="detail-page"><p style={{ color: '#64748b' }}>Loading…</p></main></>
  if (me?.role !== 'Admin') {
    return (
      <>
        <Header />
        <main className="detail-page">
          <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to auctions</Link>
          <p style={{ color: '#b91c1c' }}>Only admins can see this page. <Link href="/login" style={{ color: 'var(--amber)' }}>Log in as an admin</Link> (try the Admin demo).</p>
        </main>
      </>
    )
  }

  const t = stats?.totals
  const kpis = t ? [
    ['Users', t.users], ['Auctions', t.auctions], ['Bids', t.bids],
    ['Sales value', money(t.revenue)], ['Priced above average', t.aboveAvgStart],
  ] : []

  return (
    <>
      <Header />
      <main className="detail-page" style={{ maxWidth: 1100 }}>
        <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to auctions</Link>
        <h1 style={{ fontSize: 30, letterSpacing: -1.2, margin: '0 0 6px' }}>Admin dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 24px' }}>Live numbers from MySQL (GROUP BY, HAVING, JOIN, subqueries) and MongoDB (aggregation pipelines).</p>
        {error && <div className="inline-error">{error}</div>}
        {!stats && !error && <p style={{ color: '#64748b' }}>Loading numbers…</p>}

        {stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 22 }}>
              {kpis.map(([label, value]) => (
                <div key={label} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
                  <small style={{ color: '#94a3b8', fontSize: 10, display: 'block', marginBottom: 6 }}>{label}</small>
                  <b style={{ fontSize: 22, color: 'var(--navy)' }}>{value}</b>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18 }}>
              <Card title="Auctions by status" note="MySQL: GROUP BY Status">
                <Table head={['Status', 'Auctions']} rows={stats.auctionsByStatus.map((r) => [r.status, r.count])} />
              </Card>
              <Card title="Users by role" note="MySQL: GROUP BY Role">
                <Table head={['Role', 'Users']} rows={stats.usersByRole.map((r) => [r.role, r.count])} />
              </Card>
              <Card title="Activity by category" note="MySQL: LEFT JOIN across 3 tables + GROUP BY">
                <Table head={['Category', 'Auctions', 'Bids']} rows={stats.categories.map((r) => [r.name, r.auctions, r.bids])} />
              </Card>
              <Card title="Most active bidders" note="MySQL: GROUP BY with HAVING COUNT(*) >= 2">
                <Table head={['Bidder', 'Bids', 'Highest bid']} rows={stats.topBidders.map((r) => [r.name, r.bids, money(r.highest)])} />
              </Card>
              <Card title="Seller sales" note="MySQL: JOIN of Users, Auctions, Payments + SUM">
                <Table head={['Seller', 'Items sold', 'Sales value']} rows={stats.sellers.map((r) => [r.name, r.sold, money(r.revenue)])} />
              </Card>
              <Card title="Notifications by type" note="MongoDB: aggregate with $group and $cond">
                {stats.mongo.available
                  ? <Table head={['Type', 'Total', 'Unread']} rows={stats.mongo.notificationsByType.map((r) => [r.type, r.total, r.unread])} />
                  : <p style={{ fontSize: 12, color: '#b91c1c' }}>MongoDB is not reachable.</p>}
              </Card>
              <Card title="Most used tags" note="MongoDB: aggregate with $unwind, $group, $sort, $limit">
                {stats.mongo.available
                  ? <Table head={['Tag', 'Auctions']} rows={stats.mongo.topTags.map((r) => [r.tag, r.auctions])} />
                  : <p style={{ fontSize: 12, color: '#b91c1c' }}>MongoDB is not reachable.</p>}
              </Card>
            </div>
          </>
        )}
      </main>
    </>
  )
}
