// File upload logic — uploads to Supabase storage, returns paths/URLs

import { SupabaseClient } from '@supabase/supabase-js'

export interface UploadResult {
  hiresPath:   string
  previewUrl:  string
  galleryUrls: string[]
}

export async function uploadArtworkFiles(
  supabase:    SupabaseClient,
  sku:         string,
  hiresFile:   File,
  imageFiles:  (File | null)[],
  onProgress?: (msg: string) => void,
): Promise<UploadResult> {

  // Hi-res
  onProgress?.('Uploading hi-res file...')
  const hiresExt  = hiresFile.name.split('.').pop()
  const hiresPath = `${sku}-hires.${hiresExt}`
  const { error: hiresError } = await supabase.storage
    .from('artwork-hires')
    .upload(hiresPath, hiresFile, { contentType: hiresFile.type, upsert: true })
  if (hiresError) throw hiresError

  // Main preview
  onProgress?.('Uploading preview...')
  const previewFile = imageFiles[0]!
  const previewExt  = previewFile.name.split('.').pop()
  const previewPath = `${sku}-preview.${previewExt}`
  const { error: previewError } = await supabase.storage
    .from('artwork-previews')
    .upload(previewPath, previewFile, { contentType: previewFile.type, upsert: true })
  if (previewError) throw previewError
  const { data: urlData } = supabase.storage.from('artwork-previews').getPublicUrl(previewPath)

  // Gallery
  onProgress?.('Uploading gallery...')
  const galleryUrls: string[] = []
  for (let i = 1; i <= 2; i++) {
    const gFile = imageFiles[i]
    if (!gFile) continue
    const gExt  = gFile.name.split('.').pop()
    const gPath = `gallery/${sku}-gallery-${i}.${gExt}`
    const { error: gError } = await supabase.storage
      .from('artwork-previews')
      .upload(gPath, gFile, { contentType: gFile.type })
    if (gError) { console.error(gError); continue }
    const { data: gUrl } = supabase.storage.from('artwork-previews').getPublicUrl(gPath)
    galleryUrls.push(gUrl.publicUrl)
  }

  return { hiresPath, previewUrl: urlData.publicUrl, galleryUrls }
}

export async function uploadBundleCover(
  supabase: SupabaseClient,
  file:     File,
): Promise<string | null> {
  const ext  = file.name.split('.').pop()
  const path = `bundle-covers/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('artwork-previews')
    .upload(path, file, { contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from('artwork-previews').getPublicUrl(path)
  return data.publicUrl
}
