'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Header from '@/components/Header'
import { createAuction, getCategories, getMe, type Category, type Me } from '@/lib/api'

const pad = (n: number) => String(n).padStart(2, '0')
const toInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

const area = { display: 'block', width: '100%', minHeight: 84, border: '1px solid var(--line)', borderRadius: 7, marginTop: 7, padding: 12, font: 'inherit', outline: 0 } as const

export default function SellPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  const [itemName, setItemName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [startingPrice, setStartingPrice] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [tags, setTags] = useState('')
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([{ key: 'Condition', value: '' }])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const now = new Date()
    setStartTime(toInput(now))
    setEndTime(toInput(new Date(now.getTime() + 24 * 3600000)))
    getMe().then(setMe).catch(() => {}).finally(() => setReady(true))
    getCategories().then(setCategories).catch(() => {})
  }, [])

  const setSpec = (i: number, field: 'key' | 'value', v: string) =>
    setSpecs((s) => s.map((row, j) => (j === i ? { ...row, [field]: v } : row)))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { id } = await createAuction({
        itemName,
        description,
        categoryId: Number(categoryId),
        startingPrice: Number(startingPrice),
        reservePrice: reservePrice === '' ? null : Number(reservePrice),
        startTime,
        endTime,
        imageUrl,
        specifications: Object.fromEntries(specs.filter((s) => s.key.trim() && s.value.trim()).map((s) => [s.key.trim(), s.value.trim()])),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      router.push(`/auctions/${id}`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  if (!ready) return <><Header /><main className="detail-page"><p style={{ color: '#64748b' }}>Loading…</p></main></>
  if (!me || me.role !== 'Seller') {
    return (
      <>
        <Header />
        <main className="detail-page">
          <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to auctions</Link>
          <p style={{ color: '#b91c1c' }}>Only sellers can create auctions. <Link href="/login" style={{ color: 'var(--amber)' }}>Log in as a seller</Link> (try the Seller demo).</p>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="detail-page">
        <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to auctions</Link>
        <form className="form-wrap" style={{ width: 'min(680px,100%)' }} onSubmit={submit}>
          <h2>Create an auction</h2>
          <p>Price and timing are saved in MySQL. Photo, specs and tags are saved in MongoDB.</p>
          {error && <div className="inline-error">{error}</div>}

          <label>Item name<input required maxLength={100} value={itemName} onChange={(e) => setItemName(e.target.value)} /></label>
          <label>Category
            <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Choose a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Description<textarea maxLength={500} style={area} value={description} onChange={(e) => setDescription(e.target.value)} /></label>

          <div className="two-input">
            <label>Starting price (₹)<input required type="number" min="1" step="1" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} /></label>
            <label>Reserve price (₹, optional)<input type="number" min="1" step="1" value={reservePrice} onChange={(e) => setReservePrice(e.target.value)} /></label>
          </div>
          <div className="two-input">
            <label>Starts<input required type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
            <label>Ends<input required type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>
          </div>

          <label>Photo link (optional)<input type="url" placeholder="https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /></label>
          <label>Tags (comma separated)<input placeholder="phone, apple, smartphone" value={tags} onChange={(e) => setTags(e.target.value)} /></label>

          <label>Specifications</label>
          {specs.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input placeholder="e.g. Storage" value={s.key} onChange={(e) => setSpec(i, 'key', e.target.value)} style={{ marginTop: 0 }} />
              <input placeholder="e.g. 256 GB" value={s.value} onChange={(e) => setSpec(i, 'value', e.target.value)} style={{ marginTop: 0 }} />
              <button type="button" aria-label="Remove" onClick={() => setSpecs((r) => r.filter((_, j) => j !== i))} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
            </div>
          ))}
          {specs.length < 12 && (
            <button type="button" onClick={() => setSpecs((r) => [...r, { key: '', value: '' }])} style={{ border: 0, background: 'transparent', color: 'var(--navy)', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', gap: 5, alignItems: 'center' }}>
              <Plus size={14} /> Add a spec
            </button>
          )}

          <button className="button-primary full" disabled={busy} type="submit"><span>{busy ? 'Creating…' : 'Create auction'}</span></button>
        </form>
      </main>
    </>
  )
}
