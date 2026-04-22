'use client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/lib/cart'
import { calculatePrices, formatMVR } from '@/lib/pricing'

interface Props {
  open: boolean
  onClose: () => void
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

export function CartDrawer({ open, onClose }: Props) {
  const router = useRouter()
  const { items, remove, clear } = useCart()

  const subtotal = items.reduce((sum, item) => {
    const prices = calculatePrices(item.artistPrice, item.offerPct || 0, item.offerLabel, 'pickup', item.printSize)
    return sum + prices.artworkLineItem
  }, 0)

  function goToCheckout() {
    onClose()
    router.push('/checkout')
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.3)' }}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '100%', maxWidth: 400,
              zIndex: 201,
              backgroundColor: '#faf9f6',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '0.5px solid var(--color-border)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 500 }}>Cart</h2>
                {items.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, fontSize: 20, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>🛒</p>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                    Your cart is empty.
                  </p>
                  <button
                    onClick={onClose}
                    style={{ fontSize: 13, padding: '9px 20px', borderRadius: 20, border: '0.5px solid #1a1a1a', background: '#1a1a1a', color: '#fff', cursor: 'pointer' }}
                  >
                    Browse artworks
                  </button>
                </div>
              ) : (
                <>
                  {items.map((item, i) => {
                    const prices = calculatePrices(item.artistPrice, item.offerPct || 0, item.offerLabel, 'pickup', item.printSize)
                    return (
                      <div
                        key={`${item.artworkId}-${item.printSize}`}
                        style={{
                          display: 'flex', gap: 12,
                          paddingBottom: 16, marginBottom: 16,
                          borderBottom: i < items.length - 1 ? '0.5px solid var(--color-border)' : 'none',
                        }}
                      >
                        {/* Thumbnail */}
                        {item.previewUrl && (
                          <img
                            src={item.previewUrl}
                            alt={item.artworkTitle}
                            style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0, pointerEvents: 'none' }}
                          />
                        )}

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.artworkTitle}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 1 }}>by {item.artistName}</p>
                          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                            {item.printSize} print
                          </p>
                          {item.offerPct ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(prices.artworkLineItem)}</span>
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                                {formatMVR(item.artistPrice + item.printingFee)}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(prices.artworkLineItem)}</span>
                          )}
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => remove(item.artworkId, item.printSize)}
                          title="Remove item"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-text-muted)',
                            padding: 6,
                            borderRadius: 8,
                            alignSelf: 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'color 0.15s, background 0.15s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.color = '#c10000'
                            ;(e.currentTarget as HTMLElement).style.background = 'rgba(193,0,0,0.06)'
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'
                            ;(e.currentTarget as HTMLElement).style.background = 'none'
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )
                  })}

                  {items.length > 1 && (
                    <button
                      onClick={clear}
                      style={{ fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <TrashIcon />
                      Clear cart
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div style={{
                padding: '16px 20px',
                borderTop: '0.5px solid var(--color-border)',
                flexShrink: 0,
                backgroundColor: '#faf9f6',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Subtotal</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{formatMVR(subtotal)}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--color-text-hint)', marginBottom: 14 }}>
                  Delivery fee added at checkout
                </p>
                <button
                  onClick={goToCheckout}
                  style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none', background: '#1a1a1a', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 8 }}
                >
                  Checkout — {formatMVR(subtotal)}
                </button>
                <button
                  onClick={onClose}
                  style={{ width: '100%', padding: '10px 20px', borderRadius: 12, border: '0.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: 13, cursor: 'pointer' }}
                >
                  Continue shopping
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
