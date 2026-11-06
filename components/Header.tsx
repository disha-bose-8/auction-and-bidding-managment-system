'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Sparkles } from 'lucide-react'
import { getMe, getNotifications, logout, markNotificationsRead, type Me } from '@/lib/api'
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
        if (user) getNotifications().then(setNotes).catch(() => {})
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  // keep the bell fresh while the page is open
  useEffect(() => {
    if (!me) return
    const t = window.setInterval(() => getNotifications().then(setNotes).catch(() => {}), 30000)
    return () => window.clearInterval(t)
  }, [me])

  const toggleBell = () => {
    if (!open) getNotifications().then(setNotes).catch(() => {})
    setOpen(!open)
  }

  const readAll = async () => {
    await markNotificationsRead().catch(() => {})
    setNotes((list) => list.map((n) => ({ ...n, unread: false })))
  }

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
          {ready && me?.role === 'Seller' && (
            <>
              <Link href="/sell">Create auction</Link>
              <Link href={`/sellers/${me.id}`}>My profile</Link>
            </>
          )}
          {ready && me?.role === 'Admin' && <Link href="/admin">Dashboard</Link>}
        </nav>
        <div className="nav-actions">
          {ready && me && (
            <>
              <button className="icon-btn notification-btn" aria-label="Notifications" onClick={toggleBell}>
                <Bell size={19} />
                {unread > 0 && <span className="notification-dot">{unread}</span>}
              </button>
              <span className="login-link">{me.name} · {me.role}</span>
              <button className="button-primary small" style={{ cursor: 'pointer' }} onClick={doLogout}>Log out</button>
              {open && (
                <div className="notification-menu">
                  <div className="notification-head"><b>Notifications</b><span className="unread-label">{unread} unread</span></div>
                  {notes.length === 0 && <p style={{ fontSize: 11, color: '#94a3b8', padding: '12px 3px' }}>No notifications yet.</p>}
                  {notes.map((n) => (
                    <div className="notification-item" key={n.id} style={n.unread ? undefined : { opacity: 0.6 }}>
                      <span className={`notification-icon ${n.type}`}><Bell size={14} /></span>
                      <div><b>{n.title}</b><p>{n.description}</p><small>{n.time}</small></div>
                    </div>
                  ))}
                  {unread > 0 && <button className="mark-read" onClick={readAll}>Mark all as read</button>}
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