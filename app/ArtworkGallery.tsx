'use client'
import { useState } from 'react'

interface Props {
  mainImage: string
  galleryImages: { url: string }[]
  title: string
}

export default function ArtworkGallery({ mainImage, galleryImages, title }: Props) {
  const allImages = [mainImage, ...galleryImages.map(g => g.url)]
  const [active, setActive] = useState(0)

  return (
    <div>
      {/* Hero image */}
      <div style={{
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--color-surface)',
        position: 'relative',
        marginBottom: allImages.length > 1 ? 10 : 0,
      }}>
        <img
          src={allImages[active]}
          alt={title}
          style={{
            width: '100%',
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
            objectFit: 'contain',
            maxHeight: 520,
          }}
        />
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'default' }}
          onContextMenu={e => e.preventDefault()}
        />
      </div>

      {/* Thumbnails below — horizontal row, fixed size */}
      {allImages.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
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
                border: active === i
                  ? '2px solid #1a1a1a'
                  : '0.5px solid var(--color-border)',
                transition: 'border-color 0.15s',
                background: 'var(--color-surface)',
                position: 'relative',
              }}
            >
              <img
                src={img}
                alt={'View ' + (i + 1)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{ position: 'absolute', inset: 0 }}
                onContextMenu={e => e.preventDefault()}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
