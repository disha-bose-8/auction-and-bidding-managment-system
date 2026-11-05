'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Gavel, ShieldCheck } from 'lucide-react'

// seeded accounts from sql/auction_full_script.sql (all use Password@123 after 04_patch.sql)
const DEMO = {
  Bidder: 'sneha@mail.com',
  Seller: 'meera@mail.com',
  Admin: 'aarav@mail.com',
} as const
const DEMO_PASSWORD = 'Password@123'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const doLogin = async (em: string, pw: string) => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password: pw }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('Could not reach the server')
    } finally {
      setLoading(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    doLogin(email, password)
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <Link href="/" className="brand"><span className="brand-mark">✦</span>Bid<span>Hub</span></Link>
        <div>
          <div className="eyebrow">THE ART OF THE BID</div>
          <h1>Every great find<br /><em>starts with a bid.</em></h1>
          <p>Join a community of curious collectors, trusted sellers and competitive bidders.</p>
        </div>
        <small>BidHub — DBMS Level 3 Project</small>
      </section>
      <section className="auth-form">
        <form className="form-wrap" onSubmit={submit}>
          <span className="form-icon"><Gavel size={20} /></span>
          <h2>Welcome back</h2>
          <p>Log in to continue exploring.</p>
          <label>Email address<input required type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input required type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <p role="alert" style={{ color: '#b91c1c', fontSize: 13 }}>{error}</p>}
          <button type="submit" className="button-primary full" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'} <ArrowRight size={16} />
          </button>
          <div className="divider"><span>or try a demo role</span></div>
          <div className="demo-buttons">
            {(Object.keys(DEMO) as (keyof typeof DEMO)[]).map((role) => (
              <button key={role} type="button" disabled={loading} onClick={() => doLogin(DEMO[role], DEMO_PASSWORD)}>
                {role} demo
              </button>
            ))}
          </div>
          <p className="form-footer">New to BidHub? <Link href="/register">Create an account</Link></p>
          <p className="secure"><ShieldCheck size={14} /> Your data is protected with secure encryption.</p>
        </form>
      </section>
    </main>
  )
}