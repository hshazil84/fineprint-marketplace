'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Header from '@/app/components/Header'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword(form)
    if (error) { toast.error(error.message); setLoading(false); return }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role === 'admin') router.push('/admin/dashboard')
    else if (profile?.role === 'artist') router.push('/artist/dashboard')
    else router.push('/storefront')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-background-primary)' }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 4 }}>Log in</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>Artist or admin account</p>
          <form onSubmit={handleLogin} className="card">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <Link href="/auth/forgot-password" style={{ fontSize: 12, color: 'var(--color-teal)' }}>
                Forgot password?
              </Link>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center' }}>
              Don't have an account?{' '}
              <Link href="/auth/signup" style={{ color: 'var(--color-teal)' }}>Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
