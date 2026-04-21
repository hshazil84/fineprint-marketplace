'use client'
import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useCart } from '@/lib/cart'
import { CartDrawer } from '@/app/components/CartDrawer'

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 474.77 80.5" style="height:22px;width:auto;display:block;"><defs><linearGradient id="fp-lg-h" x1="244.97" y1="73.25" x2="474.77" y2="73.25" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00adee"/><stop offset=".33" stop-color="#fff100"/><stop offset=".69" stop-color="#f05a28"/><stop offset="1" stop-color="#be1e2d"/></linearGradient></defs><path fill="currentColor" d="M6.33,50.97V17.69H0v-4.06h6.33v-2.96c0-4.27.57-7.11,1.72-8.53S11.25,0,14.21,0c.78,0,1.63.07,2.55.22.92.15,1.9.36,2.96.64v4.3c-1.01-.25-1.82-.42-2.44-.52-.62-.09-1.19-.14-1.72-.14-1.68,0-2.81.32-3.41.96-.6.64-.89,2.13-.89,4.47v3.68h8.47v4.06h-8.47v33.28h-4.92ZM25.98,5.85V.07h4.85v5.78h-4.85ZM25.98,50.97V13.63h4.85v37.34h-4.85ZM35.58,50.97V13.63h4.72v6.88c1.81-2.52,4.04-4.43,6.68-5.73s5.62-1.94,8.95-1.94c4.93,0,8.56,1.13,10.89,3.39,2.33,2.26,3.49,5.79,3.49,10.58v24.16h-4.85v-20.99c0-4.75-.78-8.05-2.34-9.91-1.56-1.86-4.23-2.79-8.02-2.79-4.27,0-7.78,1.16-10.53,3.48-2.75,2.32-4.13,5.3-4.13,8.95v21.27h-4.85ZM110.71,39.06c-.99,4.06-3.14,7.28-6.45,9.67-3.32,2.39-7.31,3.58-11.99,3.58-5.99,0-10.81-1.84-14.47-5.51-3.66-3.67-5.49-8.51-5.49-14.52s1.84-10.79,5.51-14.47c3.67-3.68,8.49-5.52,14.45-5.52s10.79,1.81,14.42,5.44,5.44,8.45,5.44,14.49v1.14h-34.52c.27,4.52,1.69,8.01,4.23,10.48,2.55,2.47,6.02,3.7,10.43,3.7,3.19,0,5.91-.74,8.17-2.22s3.85-3.56,4.77-6.25h5.51ZM77.74,29.25h28.81c-.28-3.72-1.72-6.7-4.34-8.95s-5.93-3.37-9.95-3.37-7.45,1.12-10.08,3.37c-2.64,2.25-4.12,5.23-4.44,8.95ZM114.18,64.36V13.63h4.92v6.54c1.88-2.55,4.01-4.42,6.4-5.61,2.39-1.19,5.18-1.79,8.4-1.79,5.94,0,10.73,1.79,14.37,5.39,3.64,3.59,5.45,8.3,5.45,14.13s-1.84,10.55-5.51,14.18c-3.67,3.63-8.44,5.44-14.32,5.44-3.17,0-5.94-.6-8.33-1.79-2.39-1.19-4.54-3.04-6.47-5.54v19.79h-4.92ZM119.11,32.28c0,4.57,1.33,8.2,3.99,10.89,2.66,2.7,6.24,4.04,10.74,4.04s8.09-1.35,10.77-4.06c2.68-2.71,4.03-6.33,4.03-10.87s-1.34-8.14-4.03-10.86-6.28-4.08-10.77-4.08-8.08,1.35-10.74,4.04c-2.66,2.7-3.99,6.33-3.99,10.89ZM160.82,50.97h-4.92V13.63h4.92v6.19c1.08-2.36,2.61-4.21,4.59-5.54,1.98-1.33,4.19-2,6.62-2,.8,0,1.61.09,2.43.26.82.17,1.65.43,2.5.77v4.75c-.83-.25-1.59-.44-2.31-.55-.71-.11-1.4-.17-2.07-.17-2.91,0-5.35.79-7.3,2.36-1.95,1.57-3.44,3.94-4.47,7.11v24.16ZM180.03,5.85V.07h4.85v5.78h-4.85ZM180.03,50.97V13.63h4.85v37.34h-4.85ZM189.63,50.97V13.63h4.72v6.88c1.81-2.52,4.04-4.43,6.68-5.73s5.62-1.94,8.95-1.94c4.93,0,8.56,1.13,10.89,3.39,2.33,2.26,3.49,5.79,3.49,10.58v24.16h-4.85v-20.99c0-4.75-.78-8.05-2.34-9.91-1.56-1.86-4.23-2.79-8.02-2.79-4.27,0-7.78,1.16-10.53,3.48-2.75,2.32-4.13,5.3-4.13,8.95v21.27h-4.85ZM235.71,41.02c0,2.78.31,4.48.93,5.11s1.79.95,3.51.95c.55,0,1.14-.04,1.77-.12.63-.08,1.36-.22,2.19-.43v4.23c-1.15.27-2.22.48-3.22.62-1,.14-1.95.21-2.84.21-2.62,0-4.48-.74-5.59-2.22-1.11-1.48-1.67-4.04-1.67-7.69v-23.99h-6.33v-4.06h6.33V2.68h4.92v10.94h8.47v4.06h-8.47v23.33Z"/><rect fill="url(#fp-lg-h)" x="244.97" y="66.01" width="229.79" height="14.48"/><path fill="currentColor" d="M256.83,39.63c.19,2.01,1.16,3.44,2.91,4.28,1.75.84,4.39,1.26,7.94,1.26,2.68,0,4.73-.37,6.15-1.11,1.41-.74,2.12-1.64,2.12-2.7,0-1.2-.54-1.98-1.62-2.34-1.08-.36-2.77-.63-5.07-.83l-10.85-.93c-4.07-.38-7.26-1.64-9.56-3.77-2.3-2.13-3.45-4.83-3.45-8.09,0-4.22,1.77-7.46,5.32-9.74s8.79-3.41,15.74-3.41,11.85,1.13,15.42,3.38c3.57,2.25,5.36,5.32,5.36,9.2v.36h-12c-.57-3.35-3.71-5.03-9.42-5.03-2.59,0-4.53.32-5.82.97-1.29.65-1.94,1.5-1.94,2.55s.73,1.93,2.19,2.48c1.46.55,3.73.95,6.79,1.19l8.41.65c4.21.34,7.43,1.5,9.63,3.49s3.31,4.68,3.31,8.09c0,4.6-1.81,8.11-5.43,10.53-3.62,2.42-9.05,3.63-16.28,3.63-14.47,0-21.97-4.7-22.5-14.09h12.65ZM305.78,3.41v10.21h8.98v9.13h-8.98v16.39c0,1.15.02,2.06.07,2.73.05.67.19,1.2.43,1.58.24.38.62.64,1.15.75.53.12,1.29.18,2.3.18h5.03v9.34h-8.12c-4.46,0-7.71-.7-9.78-2.08-2.06-1.39-3.09-3.81-3.09-7.26v-21.63h-5.68v-9.13h5.68V3.41h12ZM358.54,52.36h-12v-5.82c-4.17,4.51-9.2,6.76-15.09,6.76-3.35,0-6.23-.52-8.62-1.55-2.4-1.03-4.27-2.55-5.61-4.56-1.1-1.63-1.76-3.43-1.98-5.39-.22-1.96-.32-4.24-.32-6.83V13.62h12v18.76c0,1.97.12,3.65.36,5.07.24,1.41.67,2.58,1.29,3.49.62.91,1.47,1.59,2.55,2.05,1.08.46,2.48.68,4.21.68,3.45,0,6.18-.96,8.19-2.87,2.01-1.92,3.02-4.6,3.02-8.05V13.62h12v38.74ZM395.27.46h12v51.9h-12v-3.59c-1.68,1.68-3.63,2.91-5.86,3.7-2.23.79-4.85,1.19-7.87,1.19-3.26,0-6.23-.49-8.91-1.47-2.68-.98-5-2.37-6.94-4.17-1.94-1.8-3.44-3.94-4.49-6.43-1.05-2.49-1.58-5.22-1.58-8.19s.54-5.77,1.62-8.27c1.08-2.49,2.59-4.62,4.53-6.4,1.94-1.77,4.26-3.15,6.97-4.13,2.71-.98,5.71-1.47,9.02-1.47,3.07,0,5.7.43,7.91,1.29,2.2.86,4.07,2.11,5.61,3.74V.46ZM395.27,33.45c0-3.35-1.03-6.03-3.09-8.01-2.06-1.99-4.82-2.98-8.27-2.98s-6.27.98-8.3,2.95c-2.04,1.96-3.05,4.67-3.05,8.12s1.03,6.09,3.09,8.05c2.06,1.97,4.82,2.95,8.26,2.95s6.21-1.01,8.27-3.02c2.06-2.01,3.09-4.7,3.09-8.05ZM411.94,9.73V.46h12v9.27h-12ZM411.94,13.62h12v38.74h-12V13.62ZM425.82,32.95c0-3.16.55-6.01,1.65-8.55s2.71-4.71,4.82-6.51c2.11-1.8,4.68-3.19,7.73-4.17,3.04-.98,6.48-1.47,10.32-1.47s7.27.49,10.31,1.47c3.04.98,5.61,2.37,7.69,4.17,2.09,1.8,3.68,3.97,4.78,6.51,1.1,2.54,1.65,5.39,1.65,8.55s-.56,6.03-1.69,8.59c-1.12,2.56-2.73,4.74-4.82,6.54-2.08,1.8-4.65,3.19-7.69,4.17-3.04.98-6.46,1.47-10.24,1.47s-7.26-.49-10.28-1.47-5.58-2.37-7.69-4.17c-2.11-1.8-3.73-3.98-4.85-6.54-1.13-2.56-1.69-5.43-1.69-8.59ZM438.82,33.02c0,3.45,1.04,6.18,3.13,8.19,2.08,2.01,4.87,3.02,8.37,3.02s6.28-1.02,8.34-3.05c2.06-2.04,3.09-4.78,3.09-8.23s-1.03-6.18-3.09-8.19c-2.06-2.01-4.84-3.02-8.34-3.02s-6.29,1.02-8.37,3.05c-2.09,2.04-3.13,4.78-3.13,8.23Z"/></svg>`

interface HeaderProps {
  search?: string
  onSearchChange?: (val: string) => void
  onSearchSubmit?: (val: string) => void
  minimal?: boolean
  rightContent?: ReactNode
}

export default function Header({
  search = '',
  onSearchChange,
  onSearchSubmit,
  minimal = false,
  rightContent,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileSearch, setMobileSearch] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const { count: cartCount } = useCart()
  const mobileSearchRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, display_name, role')
          .eq('id', user.id)
          .single()
        setProfile(prof)
      }
    }
    loadUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser(session.user)
      else { setUser(null); setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen || cartOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen, cartOpen])

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileSearchRef.current?.focus(), 80)
      setMobileSearch(search)
    }
  }, [mobileSearchOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    window.location.href = '/storefront'
  }

  function handleMobileSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = mobileSearch.trim()
    if (onSearchChange) onSearchChange(val)
    if (onSearchSubmit) onSearchSubmit(val)
    setMobileSearchOpen(false)
    setMenuOpen(false)
  }

  function clearMobileSearch() {
    setMobileSearch('')
    if (onSearchChange) onSearchChange('')
    mobileSearchRef.current?.focus()
  }

  const displayName = profile?.display_name || profile?.full_name || ''
  const dashboardHref = profile?.role === 'admin' ? '/admin/dashboard' : profile?.role === 'artist' ? '/artist/dashboard' : '/storefront'

  const navLinks = [
    { label: 'Browse artworks', href: '/storefront' },
    { label: 'Track order', href: '/orders/track' },
    ...(profile?.role === 'artist' ? [{ label: 'My dashboard', href: '/artist/dashboard' }] : []),
    ...(profile?.role === 'admin' ? [{ label: 'Admin', href: '/admin/dashboard' }] : []),
    { label: 'Log in', href: '/auth/login', hideWhenLoggedIn: true },
    { label: 'Sign up', href: '/auth/signup', hideWhenLoggedIn: true },
  ]

  return (
    <>
      <style>{`
        .fp-nav {
          background-color: rgba(250, 249, 246, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        @media(max-width:768px) {
          .fp-header-desktop { display: none !important; }
          .fp-header-mobile { display: flex !important; }
        }
        @media(min-width:769px) {
          .fp-header-mobile { display: none !important; }
          .fp-header-desktop { display: flex !important; }
        }
      `}</style>

      <nav className="fp-nav" style={{ borderBottom: '0.5px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>

          <Link
            href="/storefront"
            style={{ textDecoration: 'none', color: 'inherit', flexShrink: 0 }}
            dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
            onClick={() => { setMenuOpen(false); setMobileSearchOpen(false) }}
          />

          {minimal ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
              {rightContent}
            </div>
          ) : (
            <>
              {/* ── DESKTOP NAV ── */}
              <div className="fp-header-desktop" style={{ flex: 1, alignItems: 'center', gap: 12 }}>
                {onSearchChange && (
                  <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
                    <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, opacity: 0.4 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5 14 14" />
                    </svg>
                    <input
                      value={search}
                      onChange={e => onSearchChange(e.target.value)}
                      placeholder="Search artworks, artists..."
                      style={{ width: '100%', padding: '7px 14px 7px 32px', background: 'rgba(0,0,0,0.04)', border: '0.5px solid var(--color-border)', borderRadius: 20, fontSize: 12, color: 'var(--color-text)', outline: 'none' }}
                    />
                    {search && (
                      <button onClick={() => onSearchChange('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-text-muted)' }}>×</button>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
                  <Link href="/orders/track" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '0.5px solid var(--color-border)', color: 'var(--color-text)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Track order
                  </Link>

                  {/* Desktop cart icon */}
                  <button
                    onClick={() => setCartOpen(true)}
                    aria-label="Cart"
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)', flexShrink: 0 }}
                  >
                    <CartIcon />
                    {cartCount > 0 && (
                      <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 15, height: 15, borderRadius: 20, background: '#1D9E75', color: '#fff', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </button>

                  {user && profile ? (
                    <>
                      {(profile.role === 'admin' || profile.role === 'artist') && (
                        <Link href={dashboardHref} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '0.5px solid var(--color-border)', color: 'var(--color-text)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          {profile.role === 'admin' ? 'Admin' : 'Dashboard'}
                        </Link>
                      )}
                      {displayName && (
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayName}
                        </span>
                      )}
                      <button onClick={handleSignOut} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '0.5px solid var(--color-border)', background: 'none', color: 'var(--color-text)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/auth/login" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '0.5px solid var(--color-border)', color: 'var(--color-text)', textDecoration: 'none' }}>Log in</Link>
                      <Link href="/auth/signup" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '0.5px solid #1a1a1a', background: '#1a1a1a', color: '#fff', textDecoration: 'none' }}>Sign up</Link>
                    </>
                  )}
                </div>
              </div>

              {/* ── MOBILE: search + cart + hamburger ── */}
              <div className="fp-header-mobile" style={{ marginLeft: 'auto', alignItems: 'center', gap: 2 }}>
                <MobileIconBtn label="Search" onClick={() => { setMobileSearchOpen(o => !o); setMenuOpen(false) }}>
                  <SearchIcon />
                </MobileIconBtn>

                <MobileIconBtn label="Cart" onClick={() => { setCartOpen(true); setMenuOpen(false) }}>
                  <CartIcon />
                  {cartCount > 0 && (
                    <span style={{ position: 'absolute', top: 6, right: 6, minWidth: 15, height: 15, borderRadius: 20, background: '#1D9E75', color: '#fff', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </MobileIconBtn>

                <MobileIconBtn label={menuOpen ? 'Close' : 'Menu'} onClick={() => { setMenuOpen(o => !o); setMobileSearchOpen(false) }}>
                  <AnimatePresence mode="wait" initial={false}>
                    {menuOpen ? (
                      <motion.span key="close" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}>
                        <CloseIcon />
                      </motion.span>
                    ) : (
                      <motion.span key="burger" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}>
                        <BurgerIcon />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </MobileIconBtn>
              </div>
            </>
          )}
        </div>

        {/* ── MOBILE SEARCH BAR ── */}
        <AnimatePresence>
          {mobileSearchOpen && (
            <motion.div
              key="mobile-search"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden', borderTop: '0.5px solid var(--color-border)' }}
            >
              <form onSubmit={handleMobileSearchSubmit} style={{ padding: '12px 20px 14px' }}>
                <div style={{ position: 'relative' }}>
                  <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, opacity: 0.4, pointerEvents: 'none' }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5 14 14" />
                  </svg>
                  <input
                    ref={mobileSearchRef}
                    value={mobileSearch}
                    onChange={e => {
                      setMobileSearch(e.target.value)
                      if (onSearchChange) onSearchChange(e.target.value)
                    }}
                    onKeyDown={e => e.key === 'Escape' && setMobileSearchOpen(false)}
                    placeholder="Search artworks, artists..."
                    style={{ width: '100%', padding: '11px 52px 11px 36px', background: 'rgba(0,0,0,0.04)', border: '0.5px solid var(--color-border)', borderRadius: 24, fontSize: 15, color: 'var(--color-text)', outline: 'none' }}
                  />
                  {mobileSearch && (
                    <button type="button" onClick={clearMobileSearch} style={{ position: 'absolute', right: 52, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0 6px', fontSize: 16, lineHeight: 1 }}>×</button>
                  )}
                  <button type="submit" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: '#1a1a1a', border: 'none', cursor: 'pointer', borderRadius: 18, padding: '6px 14px', fontSize: 13, color: '#fff', fontWeight: 500 }}>
                    Go
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── MOBILE FULL-SCREEN MENU OVERLAY ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', inset: 0, top: 56, zIndex: 99, backgroundColor: '#faf9f6', overflowY: 'auto' }}
          >
            <div style={{ padding: '28px 28px 48px' }}>
              <nav>
                {navLinks
                  .filter(l => !('hideWhenLoggedIn' in l) || !user || !l.hideWhenLoggedIn)
                  .map((link, i) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.055, duration: 0.26, ease: 'easeOut' }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        style={{ display: 'block', fontSize: '1.6rem', fontWeight: 500, color: 'var(--color-text)', textDecoration: 'none', padding: '13px 0', borderBottom: '0.5px solid var(--color-border)', letterSpacing: '-0.02em', lineHeight: 1.2 }}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                {user && (
                  <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: navLinks.length * 0.055, duration: 0.26, ease: 'easeOut' }}>
                    <button
                      onClick={() => { setMenuOpen(false); handleSignOut() }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: '1.6rem', fontWeight: 500, color: 'var(--color-text)', background: 'none', border: 'none', borderBottom: '0.5px solid var(--color-border)', cursor: 'pointer', padding: '13px 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}
                    >
                      Log out
                    </button>
                  </motion.div>
                )}
              </nav>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }} style={{ marginTop: 32, display: 'flex', gap: 20 }}>
                {[{ label: 'Terms', href: '/terms' }, { label: 'Privacy', href: '/privacy' }, { label: 'Contact', href: 'mailto:hello@fineprintmv.com' }].map(l => (
                  <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={{ fontSize: 12, color: 'var(--color-text-muted)', textDecoration: 'none' }}>{l.label}</Link>
                ))}
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }} style={{ fontSize: 11, color: 'var(--color-text-hint)', marginTop: 20 }}>
                © {new Date().getFullYear()} FinePrint Studio · Maldives
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}

function MobileIconBtn({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  )
}

function SearchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function BurgerIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
