'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `https://shop.fineprintmv.com/auth/reset-password`,
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav">
        <Link href="/storefront" className="nav-logo">Fine<span>Print</span> Studio</Link>
      </nav>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 4 }}>Reset password</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>Enter your email and we'll send you a reset link.</p>

          {sent ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Check your email</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                We sent a password reset link to <strong>{email}</strong>
              </p>
              <Link href="/auth/login" style={{ color: 'var(--color-teal)', fontSize: 13 }}>Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card">
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 14, textAlign: 'center' }}>
                Remember your password?{' '}
                <Link href="/auth/login" style={{ color: 'var(--color-teal)' }}>Log in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
