'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface WishlistContextType {
  items: number[]
  toggle: (id: number) => void
  has: (id: number) => boolean
  count: number
}

const WishlistContext = createContext<WishlistContextType>({
  items: [],
  toggle: () => {},
  has: () => false,
  count: 0,
})

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<number[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('fp_wishlist')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  function toggle(id: number) {
    setItems(prev => {
      const next = prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
      try { localStorage.setItem('fp_wishlist', JSON.stringify(next)) } catch {}
      return next
    })
  }

  return (
    <WishlistContext.Provider value={{
      items,
      toggle,
      has: (id) => items.includes(id),
      count: items.length,
    }}>
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => useContext(WishlistContext)
