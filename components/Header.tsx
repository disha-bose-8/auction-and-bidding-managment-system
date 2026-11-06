'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Sparkles } from 'lucide-react'
import { getMe, getNotifications, logout, type Me } from '@/lib/api'
import type { Notification } from '@/lib/types'

// Shared top bar. Shows Log in / Get started when logged out, name + Log out when logged in.
export default function Header() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<Notification[]>([])

  useEffect(() => {
    getMe()
      .then((user) => {
        setMe(user)
        if (user) getNotifications().then(setNotes)
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const doLogout = async () => {
    await logout()
    setMe(null)
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  const unread = notes.filter((n) => n.unread).length

  return (
    <header className="topbar">
      <div className="nav-inner">
        <Link href="/" className="brand"><span className="brand-mark"><Sparkles size={16} /></span>Bid<span>Hub</span></Link>
        <nav className="nav-links">
          <Link href="/">Browse</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#about">About</Link>
          {ready && me?.role === 'Seller' && <Link href="/sell">Create auction</Link>}
        </nav>
        <div className="nav-actions">
          {ready && me && (
            <>
              <button className="icon-btn notification-btn" aria-label="Notifications" onClick={() => setOpen(!open)}>
                <Bell size={19} />
                {unread > 0 && <span className="notification-dot">{unread}</span>}
              </button>
              <span className="login-link">{me.name} · {me.role}</span>
              <button className="button-primary small" style={{ cursor: 'pointer' }} onClick={doLogout}>Log out</button>
              {open && (
                <div className="notification-menu">
                  <div className="notification-head"><b>Notifications</b><span className="unread-label">{unread} unread</span></div>
                  {notes.map((n) => (
                    <div className="notification-item" key={n.id}>
                      <span className={`notification-icon ${n.type}`}><Bell size={14} /></span>
                      <div><b>{n.title}</b><p>{n.description}</p><small>{n.time}</small></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {ready && !me && (
            <>
              <Link href="/login" className="login-link">Log in</Link>
              <Link href="/register" className="button-primary small">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}