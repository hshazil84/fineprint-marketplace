'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMVR } from '@/lib/pricing'
import { PayoutModal } from '@/app/admin/components/PayoutModal'
import { RemittanceModal } from '@/app/admin/components/RemittanceModal'
import toast from 'react-hot-toast'

export function ArtistsTab({ onBadgeRefresh }: { onBadgeRefresh: () => void }) {
  const [artists, setArtists]   = useState<any[]>([])
  const [payouts, setPayouts]   = useState<any[]>([])
  const [orders, setOrders]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [selectedPayout, setSelectedPayout]     = useState<any>(null)
  const [remittancePayout, setRemittancePayout] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    await Promise.all([fetchArtists(), fetchPayouts(), fetchOrders()])
    setLoading(false)
  }

  async function fetchArtists() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'artist')
      .order('created_at', { ascending: false })
    setArtists(data || [])
  }

  async function fetchPayouts() {
    const { data } = await supabase
      .from('payouts')
      .select('*, profiles:artist_id(full_name, display_name, artist_code, email)')
      .order('created_at', { ascending: false })
    setPayouts(data || [])
  }

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('artist_earnings, artworks(artist_id)')
      .eq('status', 'approved')
    setOrders(data || [])
  }

  async function handleWithdrawalAction(artistId: string, action: 'approve' | 'reject') {
    const res  = await fetch('/api/admin/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistId, action }),
    })
    const data = await res.json()
    if (data.ok) {
      toast.success(action === 'approve' ? 'Artist withdrawn' : 'Withdrawal rejected')
      fetchArtists()
      onBadgeRefresh()
    } else {
      toast.error(data.error || 'Something went wrong')
    }
  }

  const pendingPayouts   = payouts.filter(p => p.status === 'pending')
  const paidPayouts      = payouts.filter(p => p.status === 'paid')
  const withdrawRequests = artists.filter(a => a.account_status === 'pending_withdrawal')
  const closedShops      = artists.filter(a => a.shop_status === 'closed')

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading artists...</div>

  return (
    <div>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          ['Total artists',       artists.length],
          ['Pending payouts',     pendingPayouts.length],
          ['Withdrawal requests', withdrawRequests.length],
          ['Closed shops',        closedShops.length],
        ].map(([label, value]) => (
          <div key={label as string} className="stat-card">
            <p className="stat-label">{label}</p>
            <p className="stat-value">{value}</p>
          </div>
        ))}
      </div>

      {/* Pending payouts */}
      {pendingPayouts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
            Pending payout requests
            <span style={{ marginLeft: 8, background: 'var(--color-teal)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>
              {pendingPayouts.length}
            </span>
          </p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {pendingPayouts.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>
                    {p.profiles?.display_name || p.profiles?.full_name}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>FP-{p.profiles?.artist_code}</span>
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{p.account_number}</span>
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={() => { navigator.clipboard.writeText(p.account_number); toast.success('Copied!') }}
                    >
                      Copy
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Requested {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{formatMVR(p.amount)}</p>
                  <button className="btn btn-sm btn-success" onClick={() => setSelectedPayout(p)}>
                    Pay and confirm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdrawal requests */}
      {withdrawRequests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#A32D2D' }}>Withdrawal requests</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {withdrawRequests.map(a => (
              <div key={a.id} style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', background: '#FCEBEB' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>
                      {a.display_name || a.full_name}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#A32D2D', marginLeft: 8 }}>FP-{a.artist_code}</span>
                    </p>
                    <p style={{ fontSize: 12, color: '#A32D2D', marginTop: 4 }}>Reason: {a.withdraw_reason || 'No reason provided'}</p>
                    <p style={{ fontSize: 11, color: '#A32D2D', marginTop: 2 }}>{a.email}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ fontSize: 11 }}
                      onClick={() => handleWithdrawalAction(a.id, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => handleWithdrawalAction(a.id, 'reject')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout history */}
      {paidPayouts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Payout history</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {paidPayouts.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>
                    {p.profiles?.display_name || p.profiles?.full_name}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>FP-{p.profiles?.artist_code}</span>
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.bank_name} · {p.account_number}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {p.paid_at ? 'Paid ' + new Date(p.paid_at).toLocaleDateString() : ''}
                  </p>
                  <button className="btn btn-sm" style={{ marginTop: 6, fontSize: 11 }} onClick={() => setRemittancePayout(p)}>
                    View remittance
                  </button>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 15, fontWeight: 500 }}>{formatMVR(p.amount)}</p>
                  <span className="badge" style={{ background: 'var(--color-teal-light)', color: 'var(--color-teal-dark)', marginTop: 4, display: 'inline-block' }}>paid</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All artists */}
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>All artists</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {artists.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No artists yet.</p>
        ) : artists.map(a => {
          const artistOrders     = orders.filter((o: any) => o.artworks?.artist_id === a.id)
          const artistPayoutsArr = payouts.filter(p => p.artist_id === a.id && p.status === 'paid')
          const totalEarned      = artistOrders.reduce((s: number, o: any) => s + (o.artist_earnings || 0), 0)
          const totalPaid        = artistPayoutsArr.reduce((s: number, p: any) => s + p.amount, 0)
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{a.display_name || a.full_name}</p>
                  {a.shop_status === 'closed' && (
                    <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '1px 7px', borderRadius: 20 }}>Shop closed</span>
                  )}
                  {a.account_status === 'pending_withdrawal' && (
                    <span style={{ fontSize: 10, background: '#FCEBEB', color: '#A32D2D', padding: '1px 7px', borderRadius: 20 }}>Withdrawal requested</span>
                  )}
                  {a.account_status === 'withdrawn' && (
                    <span style={{ fontSize: 10, background: '#1a1a1a', color: '#fff', padding: '1px 7px', borderRadius: 20 }}>Withdrawn</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  FP-{a.artist_code} · {a.email}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(totalEarned - totalPaid)} pending</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{formatMVR(totalPaid)} paid out</p>
              </div>
            </div>
          )
        })}
      </div>

      {selectedPayout && (
        <PayoutModal
          payout={selectedPayout}
          onClose={() => setSelectedPayout(null)}
          onPaid={() => { fetchPayouts(); fetchOrders(); onBadgeRefresh() }}
        />
      )}
      {remittancePayout && (
        <RemittanceModal
          payout={remittancePayout}
          onClose={() => setRemittancePayout(null)}
        />
      )}
    </div>
  )
}
