'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { getFeedbackStatus, submitFeedback } from '@/lib/api'

const Stars = ({ value }: { value: number }) => (
  <span className="stars" style={{ margin: 0 }}>
    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill={i <= value ? 'currentColor' : 'none'} />)}
  </span>
)

// Shown on a finished auction. Only the winner sees the form, and only once.
export default function FeedbackBox({ auctionId }: { auctionId: number }) {
  const [state, setState] = useState<{ eligible: boolean; given: { rating: number; comment: string | null } | null } | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getFeedbackStatus(auctionId).then(setState).catch(() => {})
  }, [auctionId])

  if (!state || (!state.eligible && !state.given)) return null

  if (state.given) {
    return (
      <div className="spec-card" style={{ marginTop: 0, marginBottom: 22 }}>
        <div className="card-heading"><h2>Your feedback</h2><Stars value={state.given.rating} /></div>
        {state.given.comment && <p style={{ fontSize: 12, color: '#5d6b7e', margin: '10px 0 0' }}>{state.given.comment}</p>}
      </div>
    )
  }

  const send = async () => {
    setError('')
    if (rating < 1) return setError('Please pick a rating')
    setBusy(true)
    try {
      await submitFeedback(auctionId, rating, comment)
      setState({ eligible: false, given: { rating, comment: comment.trim() || null } })
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="spec-card" style={{ marginTop: 0, marginBottom: 22 }}>
      <div className="card-heading"><h2>You won this auction. How was the seller?</h2></div>
      <div style={{ display: 'flex', gap: 4, margin: '12px 0' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" aria-label={`${i} stars`} onClick={() => setRating(i)}
            style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--amber)', padding: 2 }}>
            <Star size={24} fill={i <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <textarea placeholder="Say a few words (optional)" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)}
        style={{ width: '100%', minHeight: 70, border: '1px solid var(--line)', borderRadius: 7, padding: 10, font: 'inherit', fontSize: 12, outline: 0 }} />
      {error && <div className="inline-error" style={{ marginTop: 10 }}>{error}</div>}
      <button className="button-primary small" style={{ cursor: 'pointer', marginTop: 12 }} disabled={busy} onClick={send}>
        {busy ? 'Sending…' : 'Send feedback'}
      </button>
    </div>
  )
}
