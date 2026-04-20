'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function ProfileTab({ profile, onSave }: any) {
  const [form, setForm] = useState({
    full_name: profile.full_name || '',
    display_name: profile.display_name || '',
    bio: profile.bio || '',
    location: profile.location || '',
    instagram: profile.instagram || '',
    linkedin: profile.linkedin || '',
    facebook: profile.facebook || '',
    tiktok: profile.tiktok || '',
    website: profile.website || '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function save() {
    setSaving(true)
    try {
      let avatarUrl = profile.avatar_url
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = profile.id + '.' + ext
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
        if (uploadError) throw new Error('Avatar upload failed: ' + uploadError.message)
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }
      const { error: updateError } = await supabase.from('profiles').update({
        full_name: form.full_name,
        display_name: form.display_name || null,
        bio: form.bio,
        location: form.location,
        instagram: form.instagram,
        linkedin: form.linkedin,
        facebook: form.facebook,
        tiktok: form.tiktok,
        website: form.website,
        avatar_url: avatarUrl,
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div
          style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-background-secondary)', flexShrink: 0, cursor: 'pointer', border: '2px dashed var(--color-border)' }}
          onClick={() => document.getElementById('avatar-input')?.click()}
        >
          {avatarPreview
            ? <img src={avatarPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>
          }
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500 }}>Profile picture</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Tap to upload · JPG or PNG · shown on storefront</p>
        </div>
      </div>
      <input type="file" id="avatar-input" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />

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
        <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Male, Kaafu Atoll" />
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
