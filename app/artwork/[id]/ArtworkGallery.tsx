'use client'
import { useState } from 'react'

interface Props {
  mainImage: string
  galleryImages: { url: string }[]
  title: string
}

export default function ArtworkGallery({ mainImage, galleryImages, title }: Props) {
  const urls = galleryImages.map(g => g.url)
  const allImages = [mainImage, ...urls]
  const [active, setActive] = useState(0)

  return (
    <div>
      <div style={{
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--color-surface)',
        position: 'relative',
        width: '100%',
        paddingBottom: '100%',
        marginBottom: allImages.length > 1 ? 10 : 0,
      }}>
        <img
          key={active}
          src={allImages[active]}
          alt={title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          onContextMenu={e => e.preventDefault()}
        />
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} onContextMenu={e => e.preventDefault()} />
      </div>

      {allImages.length > 1 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {allImages.map((img, i) => (
            <div
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: 72,
                height: 72,
                flexShrink: 0,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                cursor: 'pointer',
                border: active === i ? '2px solid #1a1a1a' : '0.5px solid var(--color-border)',
                transition: 'border-color 0.15s',
                background: 'var(--color-surface)',
              }}
            >
              <img
                src={img}
                alt={'View ' + (i + 1)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                onContextMenu={e => e.preventDefault()}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
