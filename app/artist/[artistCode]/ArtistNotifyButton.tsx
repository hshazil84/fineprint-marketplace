'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ArtistNotifyButton({ artworkId }: { artworkId: number }) {
  const [showNotify, setShowNotify]     = useState(false)
  const [notifyEmail, setNotifyEmail]   = useState('')
  const [notifyDone, setNotifyDone]     = useState(false)
  const [notifyLoading, setNotifyLoading] = useState(false)

  async function handleNotify() {
    if (!notifyEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
      toast.error('Please enter a valid email')
      return
    }
    setNotifyLoading(true)
    try {
      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId, email: notifyEmail }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setNotifyDone(true)
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setNotifyLoading(false)
    }
  }

  if (notifyDone) {
    return (
      <p style={{ fontSize: 11, color: '#0F6E56', padding: '4px 0' }}>
        ✓ We'll notify you when it's back
      </p>
    )
  }

  if (showNotify) {
    return (
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <input
          type="email"
          value={notifyEmail}
          onChange={e => setNotifyEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNotify()}
          placeholder="your@email.com"
          autoFocus
          style={{ flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--color-border)', fontSize: 11, background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
        />
        <button
          onClick={handleNotify}
          disabled={notifyLoading}
          style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, opacity: notifyLoading ? 0.6 : 1 }}
        >
          {notifyLoading ? '...' : 'Notify'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowNotify(true)}
      style={{ width: '100%', padding: '6px 0', borderRadius: 8, border: '0.5px solid var(--color-border)', background: 'transparent', fontSize: 11, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'center' }}
    >
      Notify when available
    </button>
  )
}
