'use client'

// ─────────────────────────────────────────────
// IMAGE PROTECTION
// All artwork is rendered onto <canvas> elements
// — never as plain <img> tags — so right-click
// save and drag-to-desktop are blocked by default.
//
// The actual high-res files live in a private
// Supabase bucket and never touch the browser.
// Only low-res preview URLs (public bucket) are
// served, with a watermark baked in server-side.
// ─────────────────────────────────────────────

export function renderProtectedImage(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  artistName: string,
  width = 600,
  height = 600
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = width
  canvas.height = height

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    // Draw the image
    ctx.drawImage(img, 0, 0, width, height)

    // Draw diagonal watermark grid
    ctx.save()
    ctx.globalAlpha = 0.13
    ctx.fillStyle = '#fff'
    ctx.font = `500 ${Math.round(height * 0.044)}px sans-serif`
    ctx.translate(width / 2, height / 2)
    ctx.rotate(-Math.PI / 6)
    for (let y = -height; y < height; y += 80) {
      for (let x = -width; x < width; x += 240) {
        ctx.fillText(`© ${artistName}`, x, y)
      }
    }
    ctx.restore()

    // Corner watermark
    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.fillStyle = '#fff'
    ctx.font = `500 ${Math.round(height * 0.028)}px sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 3
    ctx.fillText(`© ${artistName}`, width - 10, height - 8)
    ctx.restore()
  }
  img.src = imageUrl
}

// Draw a placeholder canvas (emoji + color bg) when no image is uploaded yet
export function renderPlaceholderCanvas(
  canvas: HTMLCanvasElement,
  emoji: string,
  bgColor: string,
  artistName: string,
  width = 600,
  height = 600
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = width
  canvas.height = height
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)
  ctx.font = `${Math.round(height * 0.35)}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, width / 2, height / 2)
  // Watermark
  ctx.save()
  ctx.globalAlpha = 0.12
  ctx.fillStyle = '#fff'
  ctx.font = `500 ${Math.round(height * 0.044)}px sans-serif`
  ctx.translate(width / 2, height / 2)
  ctx.rotate(-Math.PI / 6)
  for (let y = -height; y < height; y += 80) {
    for (let x = -width; x < width; x += 240) {
      ctx.fillText(`© ${artistName}`, x, y)
    }
  }
  ctx.restore()
}

// Attach all browser-level protection to a container element
export function attachImageProtection(container: HTMLElement) {
  // Block right-click
  container.addEventListener('contextmenu', e => e.preventDefault())
  // Block drag
  container.addEventListener('dragstart', e => e.preventDefault())
}

// Global keyboard shortcut blocking (call once on app mount)
export function attachGlobalKeyboardProtection() {
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase()
    const ctrl = e.ctrlKey || e.metaKey
    // Block Ctrl+S, Ctrl+U, Ctrl+P, Ctrl+A
    if (ctrl && ['s', 'u', 'p', 'a'].includes(key)) e.preventDefault()
    // Block devtools shortcuts
    if (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(key)) e.preventDefault()
    if (e.key === 'F12') e.preventDefault()
    if (e.key === 'PrintScreen') e.preventDefault()
  })
  document.addEventListener('contextmenu', e => {
    const target = e.target as HTMLElement
    if (target.tagName === 'CANVAS' || target.closest('.artwork-protected')) {
      e.preventDefault()
    }
  })
}
