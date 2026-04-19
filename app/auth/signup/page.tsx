'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'buyer', location: '' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function generateArtistCode(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return 'FP'
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
    return words.map(w => w[0].toUpperCase()).join('').slice(0, 4)
  }

  async function ensureUniqueCode(baseCode: string): Promise<string> {
    let code = baseCode
    let attempt = 0
    while (true) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('artist_code', code)
        .maybeSingle()
      if (!data) return code
      attempt++
      code = baseCode + attempt
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (error) { toast.error(error.message); setLoading(false); return }
    if (!data.user) { toast.error('Something went wrong'); setLoading(false); return }

    let artistCode: string | null = null
    if (form.role === 'artist') {
      const base = generateArtistCode(form.name)
      artistCode = await ensureUniqueCode(base)
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: form.name,
      email: form.email,
      role: form.role,
      location: form.location || null,
      artist_code: artistCode,
    })

    if (profileError) { toast.error(profileError.message); setLoading(false); return }

    if (form.role === 'artist') {
      try {
        await fetch('/api/notify/artist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, location: form.location }),
        })
      } catch {}
    }

    toast.success('Account created!')
    if (form.role === 'artist') router.push('/artist/dashboard')
    else router.push('/storefront')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav">
        <Link href="/storefront" className="nav-logo">Fine<span>Print</span> Studio</Link>
      </nav>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 4 }}>Create account</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>Join FinePrint Studio</p>
          <form onSubmit={handleSignup} className="card">
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" placeholder="Ahmed Ali" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="min. 8 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">I am joining as</label>
              <select className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="buyer">Buyer — browse and buy prints</option>
                <option value="artist">Artist — sell my prints</option>
              </select>
            </div>
            {form.role === 'artist' && (
              <div className="form-group">
                <label className="form-label">Island / Location</label>
                <input className="form-input" placeholder="e.g. Malé, Kaafu Atoll" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
            )}
            {form.role === 'artist' && form.name && (
              <div style={{ background: 'var(--color-teal-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--color-teal-dark)' }}>
                  Your artist code will be: <strong>FP-{generateArtistCode(form.name)}</strong>
                </p>
              </div>
            )}
            <div className="form-group" style={{ marginTop: 8 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" required style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  I agree to the <a href="/terms" style={{ color: 'var(--color-teal)' }}>Terms & Conditions</a> and understand that pricing structure and platform fees are confidential between me and FinePrint Studio.
                </span>
              </label>
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 14, textAlign: 'center' }}>
              Already have an account?{' '}
              <Link href="/auth/login" style={{ color: 'var(--color-teal)' }}>Log in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
