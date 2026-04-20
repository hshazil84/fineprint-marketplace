import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{
      borderTop: '0.5px solid var(--color-border)',
      background: 'var(--color-background-secondary)',
      padding: '32px 0 24px',
      marginTop: 40,
    }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32, marginBottom: 32 }}>

          {/* Brand */}
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 8 }}>
              Fine<span style={{ color: 'var(--color-teal)' }}>Print</span> Studio
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              Original Maldivian art — giclée printed on Hahnemühle paper and fulfilled from Malé.
            </p>
          </div>

          {/* Shop */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 12 }}>Shop</p>
            {[
              ['Browse prints', '/storefront'],
              ['Track your order', '/orders/track'],
              ['Artist signup', '/auth/signup'],
            ].map(([label, href]) => (
              <Link key={href} href={href} style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none', marginBottom: 8 }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Info */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 12 }}>Info</p>
            {[
              ['Terms & conditions', '/terms'],
              ['Privacy policy', '/privacy'],
              ['Cookie policy', '/cookies'],
            ].map(([label, href]) => (
              <Link key={href} href={href} style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none', marginBottom: 8 }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 12 }}>Contact</p>
            <a href="mailto:hello@fineprintmv.com" style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none', marginBottom: 8 }}>
              hello@fineprintmv.com
            </a>
            <a href="tel:9998124" style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none', marginBottom: 8 }}>
              9998124
            </a>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Malé, Maldives</p>
          </div>
        </div>

        <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-hint)' }}>
            © {new Date().getFullYear()} FinePrint Studio. All rights reserved. Registered business, Maldives.
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-hint)' }}>
            Prints fulfilled from Malé · Hahnemühle certified
          </p>
        </div>
      </div>
    </footer>
  )
}
