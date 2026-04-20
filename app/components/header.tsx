'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 474.77 80.5" style="height:22px;width:auto;display:block;"><defs><linearGradient id="fp-lg-h" x1="244.97" y1="73.25" x2="474.77" y2="73.25" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00adee"/><stop offset=".33" stop-color="#fff100"/><stop offset=".69" stop-color="#f05a28"/><stop offset="1" stop-color="#be1e2d"/></linearGradient></defs><path fill="currentColor" d="M6.33,50.97V17.69H0v-4.06h6.33v-2.96c0-4.27.57-7.11,1.72-8.53S11.25,0,14.21,0c.78,0,1.63.07,2.55.22.92.15,1.9.36,2.96.64v4.3c-1.01-.25-1.82-.42-2.44-.52-.62-.09-1.19-.14-1.72-.14-1.68,0-2.81.32-3.41.96-.6.64-.89,2.13-.89,4.47v3.68h8.47v4.06h-8.47v33.28h-4.92ZM25.98,5.85V.07h4.85v5.78h-4.85ZM25.98,50.97V13.63h4.85v37.34h-4.85ZM35.58,50.97V13.63h4.72v6.88c1.81-2.52,4.04-4.43,6.68-5.73s5.62-1.94,8.95-1.94c4.93,0,8.56,1.13,10.89,3.39,2.33,2.26,3.49,5.79,3.49,10.58v24.16h-4.85v-20.99c0-4.75-.78-8.05-2.34-9.91-1.56-1.86-4.23-2.79-8.02-2.79-4.27,0-7.78,1.16-10.53,3.48-2.75,2.32-4.13,5.3-4.13,8.95v21.27h-4.85ZM110.71,39.06c-.99,4.06-3.14,7.28-6.45,9.67-3.32,2.39-7.31,3.58-11.99,3.58-5.99,0-10.81-1.84-14.47-5.51-3.66-3.67-5.49-8.51-5.49-14.52s1.84-10.79,5.51-14.47c3.67-3.68,8.49-5.52,14.45-5.52s10.79,1.81,14.42,5.44,5.44,8.45,5.44,14.49v1.14h-34.52c.27,4.52,1.69,8.01,4.23,10.48,2.55,2.47,6.02,3.7,10.43,3.7,3.19,0,5.91-.74,8.17-2.22s3.85-3.56,4.77-6.25h5.51ZM77.74,29.25h28.81c-.28-3.72-1.72-6.7-4.34-8.95s-5.93-3.37-9.95-3.37-7.45,1.12-10.08,3.37c-2.64,2.25-4.12,5.23-4.44,8.95ZM114.18,64.36V13.63h4.92v6.54c1.88-2.55,4.01-4.42,6.4-5.61,2.39-1.19,5.18-1.79,8.4-1.79,5.94,0,10.73,1.79,14.37,5.39,3.64,3.59,5.45,8.3,5.45,14.13s-1.84,10.55-5.51,14.18c-3.67,3.63-8.44,5.44-14.32,5.44-3.17,0-5.94-.6-8.33-1.79-2.39-1.19-4.54-3.04-6.47-5.54v19.79h-4.92ZM119.11,32.28c0,4.57,1.33,8.2,3.99,10.89,2.66,2.7,6.24,4.04,10.74,4.04s8.09-1.35,10.77-4.06c2.68-2.71,4.03-6.33,4.03-10.87s-1.34-8.14-4.03-10.86-6.28-4.08-10.77-4.08-8.08,1.35-10.74,4.04c-2.66,2.7-3.99,6.33-3.99,10.89ZM160.82,50.97h-4.92V13.63h4.92v6.19c1.08-2.36,2.61-4.21,4.59-5.54,1.98-1.33,4.19-2,6.62-2,.8,0,1.61.09,2.43.26.82.17,1.65.43,2.5.77v4.75c-.83-.25-1.59-.44-2.31-.55-.71-.11-1.4-.17-2.07-.17-2.91,0-5.35.79-7.3,2.36-1.95,1.57-3.44,3.94-4.47,7.11v24.16ZM180.03,5.85V.07h4.85v5.78h-4.85ZM180.03,50.97V13.63h4.85v37.34h-4.85ZM189.63,50.97V13.63h4.72v6.88c1.81-2.52,4.04-4.43,6.68-5.73s5.62-1.94,8.95-1.94c4.93,0,8.56,1.13,10.89,3.39,2.33,2.26,3.49,5.79,3.49,10.58v24.16h-4.85v-20.99c0-4.75-.78-8.05-2.34-9.91-1.56-1.86-4.23-2.79-8.02-2.79-4.27,0-7.78,1.16-10.53,3.48-2.75,2.32-4.13,5.3-4.13,8.95v21.27h-4.85ZM235.71,41.02c0,2.78.31,4.48.93,5.11s1.79.95,3.51.95c.55,0,1.14-.04,1.77-.12.63-.08,1.36-.22,2.19-.43v4.23c-1.15.27-2.22.48-3.22.62-1,.14-1.95.21-2.84.21-2.62,0-4.48-.74-5.59-2.22-1.11-1.48-1.67-4.04-1.67-7.69v-23.99h-6.33v-4.06h6.33V2.68h4.92v10.94h8.47v4.06h-8.47v23.33Z"/><rect fill="url(#fp-lg-h)" x="244.97" y="66.01" width="229.79" height="14.48"/><path fill="currentColor" d="M256.83,39.63c.19,2.01,1.16,3.44,2.91,4.28,1.75.84,4.39,1.26,7.94,1.26,2.68,0,4.73-.37,6.15-1.11,1.41-.74,2.12-1.64,2.12-2.7,0-1.2-.54-1.98-1.62-2.34-1.08-.36-2.77-.63-5.07-.83l-10.85-.93c-4.07-.38-7.26-1.64-9.56-3.77-2.3-2.13-3.45-4.83-3.45-8.09,0-4.22,1.77-7.46,5.32-9.74s8.79-3.41,15.74-3.41,11.85,1.13,15.42,3.38c3.57,2.25,5.36,5.32,5.36,9.2v.36h-12c-.57-3.35-3.71-5.03-9.42-5.03-2.59,0-4.53.32-5.82.97-1.29.65-1.94,1.5-1.94,2.55s.73,1.93,2.19,2.48c1.46.55,3.73.95,6.79,1.19l8.41.65c4.21.34,7.43,1.5,9.63,3.49s3.31,4.68,3.31,8.09c0,4.6-1.81,8.11-5.43,10.53-3.62,2.42-9.05,3.63-16.28,3.63-14.47,0-21.97-4.7-22.5-14.09h12.65ZM305.78,3.41v10.21h8.98v9.13h-8.98v16.39c0,1.15.02,2.06.07,2.73.05.67.19,1.2.43,1.58.24.38.62.64,1.15.75.53.12,1.29.18,2.3.18h5.03v9.34h-8.12c-4.46,0-7.71-.7-9.78-2.08-2.06-1.39-3.09-3.81-3.09-7.26v-21.63h-5.68v-9.13h5.68V3.41h12ZM358.54,52.36h-12v-5.82c-4.17,4.51-9.2,6.76-15.09,6.76-3.35,0-6.23-.52-8.62-1.55-2.4-1.03-4.27-2.55-5.61-4.56-1.1-1.63-1.76-3.43-1.98-5.39-.22-1.96-.32-4.24-.32-6.83V13.62h12v18.76c0,1.97.12,3.65.36,5.07.24,1.41.67,2.58,1.29,3.49.62.91,1.47,1.59,2.55,2.05,1.08.46,2.48.68,4.21.68,3.45,0,6.18-.96,8.19-2.87,2.01-1.92,3.02-4.6,3.02-8.05V13.62h12v38.74ZM395.27.46h12v51.9h-12v-3.59c-1.68,1.68-3.63,2.91-5.86,3.7-2.23.79-4.85,1.19-7.87,1.19-3.26,0-6.23-.49-8.91-1.47-2.68-.98-5-2.37-6.94-4.17-1.94-1.8-3.44-3.94-4.49-6.43-1.05-2.49-1.58-5.22-1.58-8.19s.54-5.77,1.62-8.27c1.08-2.49,2.59-4.62,4.53-6.4,1.94-1.77,4.26-3.15,6.97-4.13,2.71-.98,5.71-1.47,9.02-1.47,3.07,0,5.7.43,7.91,1.29,2.2.86,4.07,2.11,5.61,3.74V.46ZM395.27,33.45c0-3.35-1.03-6.03-3.09-8.01-2.06-1.99-4.82-2.98-8.27-2.98s-6.27.98-8.3,2.95c-2.04,1.96-3.05,4.67-3.05,8.12s1.03,6.09,3.09,8.05c2.06,1.97,4.82,2.95,8.26,2.95s6.21-1.01,8.27-3.02c2.06-2.01,3.09-4.7,3.09-8.05ZM411.94,9.73V.46h12v9.27h-12ZM411.94,13.62h12v38.74h-12V13.62ZM425.82,32.95c0-3.16.55-6.01,1.65-8.55s2.71-4.71,4.82-6.51c2.11-1.8,4.68-3.19,7.73-4.17,3.04-.98,6.48-1.47,10.32-1.47s7.27.49,10.31,1.47c3.04.98,5.61,2.37,7.69,4.17,2.09,1.8,3.68,3.97,4.78,6.51,1.1,2.54,1.65,5.39,1.65,8.55s-.56,6.03-1.69,8.59c-1.12,2.56-2.73,4.74-4.82,6.54-2.08,1.8-4.65,3.19-7.69,4.17-3.04.98-6.46,1.47-10.24,1.47s-7.26-.49-10.28-1.47-5.58-2.37-7.69-4.17c-2.11-1.8-3.73-3.98-4.85-6.54-1.13-2.56-1.69-5.43-1.69-8.59ZM438.82,33.02c0,3.45,1.04,6.18,3.13,8.19,2.08,2.01,4.87,3.02,8.37,3.02s6.28-1.02,8.34-3.05c2.06-2.04,3.09-4.78,3.09-8.23s-1.03-6.18-3.09-8.19c-2.06-2.01-4.84-3.02-8.34-3.02s-6.29,1.02-8.37,3.05c-2.09,2.04-3.13,4.78-3.13,8.23Z"/></svg>`

interface HeaderProps {
  search?: string
  onSearchChange?: (val: string) => void
  onSearchSubmit?: (val: string) => void
}

export default function Header({ search = '', onSearchChange, onSearchSubmit }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileSearch, setMobileSearch] = useState('')
  const router = useRouter()

  function handleMobileSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mobileSearch.trim()) {
      if (onSearchSubmit) onSearchSubmit(mobileSearch.trim())
      if (onSearchChange) onSearchChange(mobileSearch.trim())
    }
    setMenuOpen(false)
  }

  return (
    <>
      <style>{`
        @keyframes slideDown {
          0% { opacity: 0; transform: translateY(-6px) }
          100% { opacity: 1; transform: translateY(0) }
        }
        @media(max-width: 768px) {
          .header-desktop { display: none !important; }
          .header-mobile { display: flex !important; }
        }
        @media(min-width: 769px) {
          .header-mobile { display: none !important; }
          .header-desktop { display: flex !important; }
        }
      `}</style>

      <nav style={{
        borderBottom: '0.5px solid var(--color-border)',
        backgroundColor: 'var(--color-background-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* Logo */}
          <Link href="/storefront" style={{ textDecoration: 'none', color: 'inherit', flexShrink: 0 }}
            dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />

          {/* Desktop nav */}
          <div className="header-desktop" style={{ flex: 1, alignItems: 'center', gap: 12 }}>
            {onSearchChange && (
              <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, opacity: 0.4 }}
                  viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5 14 14" />
                </svg>
                <input
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Search artworks, artists..."
                  style={{ width: '100%', padding: '7px 14px 7px 32px', backgroundColor: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border)', borderRadius: 20, fontSize: 12, color: 'var(--color-text)', outline: 'none' }}
                />
                {search && (
                  <button onClick={() => onSearchChange('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-text-muted)' }}>✕</button>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <Link href="/orders/track" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '0.5px solid var(--color-border)', color: 'var(--color-text)', textDecoration: 'none', whiteSpace: 'nowrap', backgroundColor: 'transparent' }}>
                Track order
              </Link>
              <Link href="/auth/login" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '0.5px solid var(--color-border)', color: 'var(--color-text)', textDecoration: 'none', backgroundColor: 'transparent' }}>
                Log in
              </Link>
              <Link href="/auth/signup" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '0.5px solid #1a1a1a', backgroundColor: '#1a1a1a', color: '#fff', textDecoration: 'none' }}>
                Sign up
              </Link>
            </div>
          </div>

          {/* Mobile hamburger button */}
          <div className="header-mobile" style={{ marginLeft: 'auto', alignItems: 'center' }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4l12 12M16 4L4 16" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 5h14M3 10h14M3 15h14" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div style={{
            backgroundColor: 'var(--color-background-primary)',
            borderTop: '0.5px solid var(--color-border)',
            padding: '16px 24px 24px',
            animation: 'slideDown 0.18s ease',
          }}>
            {/* Search — only submits on Enter, no live filtering */}
            <form onSubmit={handleMobileSearchSubmit} style={{ marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, opacity: 0.4 }}
                  viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5 14 14" />
                </svg>
                <input
                  value={mobileSearch}
                  onChange={e => setMobileSearch(e.target.value)}
                  placeholder="Search artworks, artists..."
                  style={{ width: '100%', padding: '10px 44px 10px 34px', backgroundColor: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border)', borderRadius: 20, fontSize: 14, color: 'var(--color-text)', outline: 'none' }}
                />
                <button type="submit" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: '#1a1a1a', border: 'none', cursor: 'pointer', borderRadius: 14, padding: '4px 10px', fontSize: 12, color: '#fff' }}>
                  Go
                </button>
              </div>
            </form>

            {/* Nav links */}
            {[
              ['Track order', '/orders/track'],
              ['Log in', '/auth/login'],
              ['Sign up', '/auth/signup'],
            ].map(([label, href]) => (
              <Link key={href} href={href}
                onClick={() => setMenuOpen(false)}
                style={{ display: 'block', fontSize: 15, color: 'var(--color-text)', textDecoration: 'none', padding: '13px 0', borderBottom: '0.5px solid var(--color-border)' }}>
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  )
}
