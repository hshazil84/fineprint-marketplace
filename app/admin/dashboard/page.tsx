'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from '@/app/components/Header'
import { OrdersTab }    from '@/app/admin/components/OrdersTab'
import { ArtistsTab }   from '@/app/admin/components/ArtistsTab'
import { ListingsTab }  from '@/app/admin/components/ListingsTab'
import { OffersTab }    from '@/app/admin/components/OffersTab'
import { ExportTab }    from '@/app/admin/components/ExportTab'
import { CustomersTab } from '@/app/admin/components/CustomersTab'
import { PaperCatalog } from '@/app/admin/components/PaperCatalog'

const TABS = ['orders', 'artists', 'listings', 'offers', 'customers', 'papers', 'export']

interface BadgeCounts {
  pendingOrders:      number
  pendingPayouts:     number
  pendingWithdrawals: number
  waitlistTotal:      number
}

function AdminDashboard() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab]         = useState(searchParams.get('tab') || 'orders')
  const [loading, setLoading] = useState(true)
  const [badges, setBadges]   = useState<BadgeCounts>({
    pendingOrders:      0,
    pendingPayouts:     0,
    pendingWithdrawals: 0,
    waitlistTotal:      0,
  })
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!prof || prof.role !== 'admin') { router.push('/storefront'); return }
    await fetchBadges()
    setLoading(false)
  }

  async function fetchBadges() {
    const [
      { count: pendingOrders },
      { count: pendingPayouts },
      { count: pendingWithdrawals },
      { data: waitlist },
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('payouts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'pending_withdrawal'),
      supabase.from('waitlist').select('artwork_id').is('notified_at', null),
    ])

    const waitlistTotal = waitlist
      ? Object.values(
          waitlist.reduce((acc: Record<number, number>, w: any) => {
            acc[w.artwork_id] = (acc[w.artwork_id] || 0) + 1
            return acc
          }, {})
        ).reduce((s: number, c: any) => s + c, 0)
      : 0

    setBadges({
      pendingOrders:      pendingOrders      || 0,
      pendingPayouts:     pendingPayouts     || 0,
      pendingWithdrawals: pendingWithdrawals || 0,
      waitlistTotal,
    })
  }

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>
      Loading...
    </div>
  )

  return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh' }}>
      <Header
        minimal={true}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, background: 'var(--color-red-light)', color: '#A32D2D', padding: '3px 10px', borderRadius: 20 }}>
              Admin
            </span>
            <button
              className="btn btn-sm"
              onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
            >
              Log out
            </button>
          </div>
        }
      />

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 24 }}>
          Admin dashboard
        </h1>

        {badges.pendingWithdrawals > 0 && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#A32D2D' }}>
            {badges.pendingWithdrawals} artist{badges.pendingWithdrawals > 1 ? 's have' : ' has'} requested to withdraw. Check the Artists tab.
          </div>
        )}
        {badges.waitlistTotal > 0 && (
          <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#0F6E56' }}>
            {badges.waitlistTotal} buyer{badges.waitlistTotal !== 1 ? 's' : ''} waiting on sold-out artworks. Check the Listings tab.
          </div>
        )}

        <div className="tab-bar">
          {TABS.map(t => (
            <button
              key={t}
              className={'tab' + (tab === t ? ' active' : '')}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'orders' && badges.pendingOrders > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--color-red)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>
                  {badges.pendingOrders}
                </span>
              )}
              {t === 'artists' && (badges.pendingPayouts > 0 || badges.pendingWithdrawals > 0) && (
                <span style={{ marginLeft: 6, background: 'var(--color-teal)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>
                  {badges.pendingPayouts + badges.pendingWithdrawals}
                </span>
              )}
              {t === 'listings' && badges.waitlistTotal > 0 && (
                <span style={{ marginLeft: 6, background: '#1D9E75', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>
                  {badges.waitlistTotal}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'orders'    && <OrdersTab    onBadgeRefresh={fetchBadges} />}
        {tab === 'artists'   && <ArtistsTab   onBadgeRefresh={fetchBadges} />}
        {tab === 'listings'  && <ListingsTab  onBadgeRefresh={fetchBadges} />}
        {tab === 'offers'    && <OffersTab    />}
        {tab === 'customers' && <CustomersTab />}
        {tab === 'papers'    && <PaperCatalog />}
        {tab === 'export'    && <ExportTab    />}
      </div>
    </div>
  )
}

export default function AdminDashboardWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-hint)' }}>Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  )
}
