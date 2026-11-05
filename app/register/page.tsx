'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Gavel } from 'lucide-react'

export default function Register() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', role: 'Bidder' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <Link href="/" className="brand"><span className="brand-mark">✦</span>Bid<span>Hub</span></Link>
        <div>
          <div className="eyebrow">JOIN THE MARKET</div>
          <h1>Bring your<br /><em>curiosity.</em></h1>
          <p>Bid on the unusual. Sell what matters. Be part of a better marketplace.</p>
        </div>
        <small>BidHub — DBMS Level 3 Project</small>
      </section>
      <section className="auth-form">
        <form className="form-wrap" onSubmit={submit}>
          <span className="form-icon"><Gavel size={20} /></span>
          <h2>Create your account</h2>
          <p>Start discovering exceptional pieces.</p>
          <div className="two-input">
            <label>Full name<input required placeholder="Aarav Sharma" value={form.name} onChange={set('name')} /></label>
            <label>Phone<input placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} /></label>
          </div>
          <label>Email address<input required type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} /></label>
          <label>Password<input required type="password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} /><small className="hint">Use 8+ characters with a number and symbol.</small></label>
          <label>Account type
            <select value={form.role} onChange={set('role')}>
              <option>Bidder</option>
              <option>Seller</option>
            </select>
          </label>
          {error && <p role="alert" style={{ color: '#b91c1c', fontSize: 13 }}>{error}</p>}
          <button type="submit" className="button-primary full" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'} <ArrowRight size={16} />
          </button>
          <p className="form-footer">Already have an account? <Link href="/login">Log in</Link></p>
          <p className="secure">Passwords are securely hashed with bcrypt.</p>
        </form>
      </section>
    </main>
  )
}