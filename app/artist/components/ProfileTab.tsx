'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Avatar, { genConfig } from 'react-nice-avatar'

const AVATAR_COLORS = [
  { label: 'Sky',      value: '#b6e3f4' },
  { label: 'Peach',    value: '#ffdfbf' },
  { label: 'Lavender', value: '#c0aede' },
  { label: 'Mint',     value: '#d1f4e0' },
  { label: 'Rose',     value: '#ffd6e0' },
  { label: 'Sand',     value: '#f5e6c8' },
  { label: 'Lilac',    value: '#e8d5f5' },
  { label: 'Teal',     value: '#a8e6e2' },
  { label: 'Butter',   value: '#fff3b0' },
  { label: 'Slate',    value: '#d4d8e2' },
]

function randomConfig(sex: 'man' | 'woman', bgColor: string) {
  return genConfig({
    sex,
    bgColor,
    hairStyle: sex === 'man'
      ? (['normal','thick','mohawk'] as const)[Math.floor(Math.random() * 3)]
      : (['womanLong','womanShort'] as const)[Math.floor(Math.random() * 2)],
  })
}

export function ProfileTab({ profile, onSave }: any) {
  const [form, setForm] = useState({
    full_name:    profile.full_name    || '',
    display_name: profile.display_name || '',
    bio:          profile.bio          || '',
    location:     profile.location     || '',
    instagram:    profile.instagram    || '',
    linkedin:     profile.linkedin     || '',
    facebook:     profile.facebook     || '',
    tiktok:       profile.tiktok       || '',
    website:      profile.website      || '',
  })

  const [avatarMode, setAvatarMode]             = useState<'upload' | 'illustrated'>('upload')
  const [avatarFile, setAvatarFile]             = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview]       = useState<string | null>(profile.avatar_url || null)
  const [selectedColor, setSelectedColor]       = useState(AVATAR_COLORS[0].value)
  const [avatarSex, setAvatarSex]               = useState<'man' | 'woman'>('man')
  const [avatarConfig, setAvatarConfig]         = useState(() => randomConfig('man', AVATAR_COLORS[0].value))
  const [saving, setSaving]                     = useState(false)
  const avatarRef = useRef<any>(null)
  const supabase  = createClient()

  function regenerate(sex?: 'man' | 'woman', color?: string) {
    const s = sex   ?? avatarSex
    const c = color ?? selectedColor
    setAvatarConfig(randomConfig(s, c))
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function exportAvatarToPng(): Promise<Blob | null> {
    return new Promise(resolve => {
      try {
        const svgEl = document.getElementById('nice-avatar-svg')?.querySelector('svg')
        if (!svgEl) { resolve(null); return }
        const svgData   = new XMLSerializer().serializeToString(svgEl)
        const svgBlob   = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const url       = URL.createObjectURL(svgBlob)
        const img       = new Image()
        img.onload = () => {
          const canvas  = document.createElement('canvas')
          canvas.width  = 200
          canvas.height = 200
          const ctx     = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, 200, 200)
          URL.revokeObjectURL(url)
          canvas.toBlob(blob => resolve(blob), 'image/png')
        }
        img.onerror = () => resolve(null)
        img.src = url
      } catch {
        resolve(null)
      }
    })
  }

  async function save() {
    setSaving(true)
    try {
      let avatarUrl = profile.avatar_url

      if (avatarMode === 'upload' && avatarFile) {
        const ext  = avatarFile.name.split('.').pop()
        const path = profile.id + '.' + ext
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
        if (uploadError) throw new Error('Avatar upload failed: ' + uploadError.message)
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl

      } else if (avatarMode === 'illustrated') {
        toast.loading('Saving illustrated avatar...', { id: 'avatar' })
        const blob = await exportAvatarToPng()
        if (blob) {
          const path = profile.id + '-avatar.png'
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, blob, { upsert: true, contentType: 'image/png' })
          if (uploadError) throw new Error('Avatar upload failed: ' + uploadError.message)
          const { data } = supabase.storage.from('avatars').getPublicUrl(path)
          avatarUrl = data.publicUrl
        }
        toast.dismiss('avatar')
      }

      const { error: updateError } = await supabase.from('profiles').update({
        full_name:    form.full_name,
        display_name: form.display_name || null,
        bio:          form.bio,
        location:     form.location,
        instagram:    form.instagram,
        linkedin:     form.linkedin,
        facebook:     form.facebook,
        tiktok:       form.tiktok,
        website:      form.website,
        avatar_url:   avatarUrl,
      }).eq('id', profile.id)
      if (updateError) throw updateError

      onSave({ ...form, avatar_url: avatarUrl })
      toast.success('Profile saved!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Your public profile</p>

      {/* ── AVATAR SECTION ── */}
      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Profile picture</p>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {/* Upload photo — recommended */}
        <button
          onClick={() => setAvatarMode('upload')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, padding: '7px 14px', borderRadius: 20,
            border: avatarMode === 'upload' ? 'none' : '0.5px solid var(--color-border)',
            cursor: 'pointer',
            background: avatarMode === 'upload' ? '#1a1a1a' : 'var(--color-surface)',
            color: avatarMode === 'upload' ? '#fff' : 'var(--color-text-muted)',
            fontWeight: avatarMode === 'upload' ? 500 : 400,
            transition: 'all 0.15s',
          }}
        >
          📷 Upload photo
          {avatarMode !== 'upload' && (
            <span style={{
              fontSize: 9, background: '#1D9E75', color: '#fff',
              padding: '2px 6px', borderRadius: 10, fontWeight: 600,
              lineHeight: 1.4, letterSpacing: '0.02em',
            }}>
              recommended
            </span>
          )}
        </button>

        {/* Illustrated */}
        <button
          onClick={() => setAvatarMode('illustrated')}
          style={{
            fontSize: 12, padding: '7px 14px', borderRadius: 20,
            border: avatarMode === 'illustrated' ? 'none' : '0.5px solid var(--color-border)',
            cursor: 'pointer',
            background: avatarMode === 'illustrated' ? '#1a1a1a' : 'var(--color-surface)',
            color: avatarMode === 'illustrated' ? '#fff' : 'var(--color-text-muted)',
            fontWeight: avatarMode === 'illustrated' ? 500 : 400,
            transition: 'all 0.15s',
          }}
        >
          ✦ Illustrated
        </button>
      </div>

      {/* Avatar preview + controls */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 16 }}>

        {/* Avatar circle */}
        <div style={{
          width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          border: '2px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {avatarMode === 'illustrated' ? (
            <div id="nice-avatar-svg" style={{ width: 96, height: 96 }}>
              <Avatar
                style={{ width: 96, height: 96 }}
                {...avatarConfig}
              />
            </div>
          ) : avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ fontSize: 32, opacity: 0.2 }}>👤</div>
          )}
        </div>

        {/* Controls */}
        <div style={{ flex: 1 }}>
          {avatarMode === 'upload' && (
            <>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
                Upload a clear photo of yourself or your studio logo.
                Buyers connect better with a real face.<br />JPG or PNG.
              </p>
              <button
                onClick={() => document.getElementById('avatar-input')?.click()}
                style={{ fontSize: 12, padding: '7px 16px', borderRadius: 20, border: '0.5px solid var(--color-border)', background: 'none', cursor: 'pointer', color: 'var(--color-text)' }}
              >
                {avatarFile ? 'Change photo' : 'Choose photo'}
              </button>
              {avatarFile && (
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
                  {avatarFile.name} · {(avatarFile.size / 1024).toFixed(0)} KB
                </p>
              )}
            </>
          )}

          {avatarMode === 'illustrated' && (
            <>
              {/* Male / Female */}
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>Style</p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {([
                  { key: 'man',   label: '👦 Male' },
                  { key: 'woman', label: '👧 Female' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setAvatarSex(key)
                      regenerate(key, selectedColor)
                    }}
                    style={{
                      fontSize: 11, padding: '5px 12px', borderRadius: 20,
                      border: avatarSex === key ? 'none' : '0.5px solid var(--color-border)',
                      cursor: 'pointer',
                      background: avatarSex === key ? '#1a1a1a' : 'var(--color-surface)',
                      color: avatarSex === key ? '#fff' : 'var(--color-text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Colour swatches */}
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>Background</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => {
                      setSelectedColor(c.value)
                      setAvatarConfig(prev => ({ ...prev, bgColor: c.value }))
                    }}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: c.value,
                      border: selectedColor === c.value ? '2.5px solid #1a1a1a' : '1.5px solid var(--color-border)',
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                      boxShadow: selectedColor === c.value ? '0 0 0 2px #fff, 0 0 0 4px #1a1a1a' : 'none',
                      transition: 'box-shadow 0.15s',
                    }}
                  />
                ))}
              </div>

              {/* Regenerate */}
              <button
                onClick={() => regenerate()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, padding: '7px 16px', borderRadius: 20,
                  border: '0.5px solid var(--color-border)',
                  background: 'none', cursor: 'pointer', color: 'var(--color-text)',
                }}
              >
                <span style={{ fontSize: 15 }}>↻</span> New character
              </button>
            </>
          )}
        </div>
      </div>

      <input type="file" id="avatar-input" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />

      {/* Contextual tips */}
      {avatarMode === 'illustrated' && (
        <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Not sure what photo to use? Pick an illustrated avatar for now — you can always swap to a real photo later.
          </p>
        </div>
      )}
      {avatarMode === 'upload' && !avatarPreview && (
        <div style={{ background: 'var(--color-teal-light)', border: '0.5px solid var(--color-teal)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: 'var(--color-teal-dark)', lineHeight: 1.6 }}>
            💡 Profiles with a real photo get significantly more trust from buyers. A clear headshot or studio photo works best.
          </p>
        </div>
      )}

      {/* ── PROFILE FIELDS ── */}
      <div className="form-group">
        <label className="form-label">Full name</label>
        <input className="form-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Your legal name" />
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Your legal name — not shown publicly</p>
      </div>

      <div className="form-group">
        <label className="form-label">Display name</label>
        <input className="form-input" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} placeholder="e.g. One Media, Naif Studio" />
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Shown on your artworks and public profile. Leave blank to use your full name.</p>
      </div>

      <div className="form-group">
        <label className="form-label">Bio</label>
        <textarea className="form-input" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Tell buyers about yourself and your art..." />
      </div>

      <div className="form-group">
        <label className="form-label">Island / Location</label>
        <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Malé, Kaafu Atoll" />
      </div>

      <p style={{ fontSize: 13, fontWeight: 500, marginTop: 4, marginBottom: 10 }}>Social links</p>

      <div className="form-group">
        <label className="form-label">Instagram</label>
        <input className="form-input" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@yourusername" />
      </div>
      <div className="form-group">
        <label className="form-label">TikTok</label>
        <input className="form-input" value={form.tiktok} onChange={e => setForm({ ...form, tiktok: e.target.value })} placeholder="@yourusername" />
      </div>
      <div className="form-group">
        <label className="form-label">Facebook</label>
        <input className="form-input" value={form.facebook} onChange={e => setForm({ ...form, facebook: e.target.value })} placeholder="facebook.com/yourpage" />
      </div>
      <div className="form-group">
        <label className="form-label">LinkedIn</label>
        <input className="form-input" value={form.linkedin} onChange={e => setForm({ ...form, linkedin: e.target.value })} placeholder="linkedin.com/in/yourprofile" />
      </div>
      <div className="form-group">
        <label className="form-label">Website</label>
        <input className="form-input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://yoursite.com" />
      </div>

      <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save profile'}
      </button>
    </div>
  )
}
