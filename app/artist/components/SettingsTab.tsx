'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import AccountStatusBanner from './AccountStatusBanner'

export function SettingsTab({ profile, onProfileUpdate }: { profile: any, onProfileUpdate: (updates: any) => void }) {
  const [shopClosing, setShopClosing]           = useState(false)
  const [withdrawing, setWithdrawing]           = useState(false)
  const [withdrawReason, setWithdrawReason]     = useState('')
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [accountStatus, setAccountStatus]       = useState(profile?.account_status ?? 'active')

  const isShopClosed = profile?.shop_status === 'closed'

  async function toggleShop() {
    setShopClosing(true)
    try {
      const newStatus = isShopClosed ? 'open' : 'closed'
      const res = await fetch('/api/notify/shop-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistName: profile.display_name || profile.full_name,
          artistCode: profile.artist_code,
          status: newStatus,
        }),
      })
      if (!res.ok) throw new Error('Failed to update shop status')
      onProfileUpdate({ shop_status: newStatus })
      toast.success(newStatus === 'closed'
        ? 'Shop closed — your artworks are hidden from the storefront'
        : 'Shop is open — your artworks are visible again')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setShopClosing(false)
    }
  }

  async function submitWithdraw() {
    if (!withdrawReason.trim()) { toast.error('Please provide a reason'); return }
    setWithdrawing(true)
    try {
      const res = await fetch('/api/artist/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_withdrawal',
          artistId: profile.id,
          reason: withdrawReason,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to submit request')
      onProfileUpdate({ account_status: 'pending_withdrawal' })
      setAccountStatus('pending_withdrawal')
      toast.success('Withdrawal request submitted — we will be in touch.')
      setShowWithdrawForm(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setWithdrawing(false)
    }
  }

  async function handleUnpause() {
    try {
      const res = await fetch('/api/artist/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unpause',
          artistId: profile.id,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to unpause')
      onProfileUpdate({ account_status: 'active' })
      setAccountStatus('active')
      toast.success('Your account is active again!')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>

      <AccountStatusBanner
        status={accountStatus}
        onManage={handleUnpause}
      />

      {/* Close shop */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              {isShopClosed ? 'Your shop is closed' : 'Close shop temporarily'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              {isShopClosed
                ? 'Your artworks are hidden from the storefront. Reopen anytime.'
                : 'Temporarily hide all your artworks from the storefront. Useful if you need a break or are travelling. You can reopen anytime.'}
            </p>
          </div>
          <button
            className="btn btn-sm"
            style={{
              flexShrink: 0,
              fontSize: 12,
              background: isShopClosed ? '#1D9E75' : 'none',
              color: isShopClosed ? '#fff' : 'var(--color-text)',
              border: isShopClosed ? 'none' : '0.5px solid var(--color-border)',
            }}
            onClick={toggleShop}
            disabled={shopClosing}
          >
            {shopClosing ? 'Updating...' : isShopClosed ? 'Reopen shop' : 'Close shop'}
          </button>
        </div>
        {isShopClosed && (
          <div style={{ marginTop: 12, background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ fontSize: 12, color: '#633806' }}>
              Your shop is currently closed. Buyers cannot see your artworks on the storefront.
            </p>
          </div>
        )}
      </div>

      {/* Withdraw from platform */}
      <div className="card">
        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Withdraw from platform</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16, lineHeig
