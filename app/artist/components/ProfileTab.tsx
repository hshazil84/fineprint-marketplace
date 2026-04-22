'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const AVATAR_COLORS = [
  { label: 'Sky',      value: 'b6e3f4' },
  { label: 'Peach',    value: 'ffdfbf' },
  { label: 'Lavender', value: 'c0aede' },
  { label: 'Mint',     value: 'd1f4e0' },
  { label: 'Rose',     value: 'ffd6e0' },
  { label: 'Sand',     value: 'f5e6c8' },
  { label: 'Lilac',    value: 'e8d5f5' },
  { label: 'Teal',     value: 'a8e6e2' },
  { label: 'Butter',   value: 'fff3b0' },
  { label: 'Slate',    value: 'd4d8e2' },
]

function dicebearUrl(seed: string, color: string) {
  return `https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${color}&backgroundType=solid&scale=110`
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

  // Avatar state
  const [avatarMode, setAvatarMode]       = useState<'current' | 'illustrated' | 'upload'>('current')
  const [avatarFile, setAvatarFile]       = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null)
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0].value)
  const [diceSeed, setDiceSeed]           = useState(profile.display_name || profile.full_name || 'artist')
  const [saving, setSaving]               = useState(false)
  const supabase = createClient()

  const illustratedUrl = dicebearUrl(diceSeed, selectedColor)

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarMode('upload')
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // What shows in the big avatar preview circle
  const previewSrc = avatarMode === 'illustrated'
    ? illustratedUrl
    : avatarPreview

  async function save() {
    setSaving(true)
    try {
      let avatarUrl = profile.avatar_url

      if (avatarMode === 'upload' && avatarFile) {
        // Upload photo to Supabase storage
        const ext = avatarFile.name.split('.').pop()
        const path = profile.id + '.' + ext
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
        if (uploadError) throw new Error('Avatar upload failed: ' + uploadError.message)
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl

      } else if (avatarMode === 'illustrated') {
        // Fetch SVG from DiceBear and upload to Supabase as an SVG file
        toast.loading('Saving illustrated avatar...', { id: 'avatar' })
        const res = await fetch(illustratedUrl)
        const blob = await res.blob()
        const path = profile.id + '-avatar.svg'
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, { upsert: true, contentType: 'image/svg+xml' })
        if (uploadError) throw new Error('Avatar upload failed: ' + uploadError.message)
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl
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
      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Profile picture</p>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { key: 'illustrated', label: '✦ Illustrated' },
          { key: 'upload',      label: '📷 Upload photo' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAvatarMode(key as any)}
            style={{
              fontSize: 12, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: avatarMode === key ? '#1a1a1a' : 'var(--color-surface)',
              color: avatarMode === key ? '#fff' : 'var(--color-text-muted)',
              fontWeight: avatarMode === key ? 500 : 400,
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Avatar preview + controls */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>

        {/* Avatar circle */}
        <div style={{
          width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          border: '2px solid var(--color-border)',
          background: avatarMode === 'illustrated' ? '#' + selectedColor : 'var(--color-surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="Avatar preview"
              style={{ width: '100%', height: '100%', objectFit: avatarMode === 'illustrated' ? 'contain' : 'cover' }}
            />
          ) : (
            <div style={{ fontSize: 32, opacity: 0.3 }}>👤</div>
          )}
        </div>

        {/* Controls for each mode */}
        <div style={{ flex: 1 }}>
          {avatarMode === 'illustrated' && (
            <>
              {/* Seed / character variation */}
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                Character — each name generates a unique look
              </p>
              <input
                className="form-input"
                value={diceSeed}
                onChange={e => setDiceSeed(e.target.value)}
                placeholder="Type anything to change character"
                style={{ fontSize: 12, marginBottom: 10 }}
              />

              {/* Colour swatches */}
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>Background colour</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => setSelectedColor(c.value)}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#' + c.value,
                      border: selectedColor === c.value ? '2.5px solid #1a1a1a' : '1.5px solid var(--color-border)',
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                      boxShadow: selectedColor === c.value ? '0 0 0 2px #fff, 0 0 0 4px #1a1a1a' : 'none',
                      transition: 'box-shadow 0.15s',
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {avatarMode === 'upload' && (
            <>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                Upload a photo of yourself or your studio logo.<br />JPG or PNG recommended.
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
        </div>
      </div>

      <input type="file" id="avatar-input" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />

      {/* Illustrated avatar tip */}
      {avatarMode === 'illustrated' && (
        <div style={{ background: 'var(--color-teal-light)', border: '0.5px solid var(--color-teal)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: 'var(--color-teal-dark)', lineHeight: 1.6 }}>
            ✦ Your illustrated avatar is unique to you — buyers will recognise you across the storefront without using a real photo.
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
