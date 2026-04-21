'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { calculatePrices, PRINTING_FEES } from '@/lib/pricing'

export interface CartItem {
  artworkId: number
  artworkSku: string
  artworkTitle: string
  artistName: string
  artistId: string
  printSize: string
  artistPrice: number
  printingFee: number
  offerLabel: string | null
  offerPct: number | null
  previewUrl: string | null
}

interface CartContextType {
  items: CartItem[]
  add: (item: CartItem) => void
  remove: (artworkId: number, printSize: string) => void
  clear: () => void
  count: number
  has: (artworkId: number, printSize: string) => boolean
}

const CartContext = createContext<CartContextType>({
  items: [],
  add: () => {},
  remove: () => {},
  clear: () => {},
  count: 0,
  has: () => false,
})

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('fp_cart')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  function save(next: CartItem[]) {
    setItems(next)
    try { localStorage.setItem('fp_cart', JSON.stringify(next)) } catch {}
  }

  function add(item: CartItem) {
    setItems(prev => {
      const exists = prev.some(i => i.artworkId === item.artworkId && i.printSize === item.printSize)
      if (exists) return prev
      const next = [...prev, item]
      try { localStorage.setItem('fp_cart', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function remove(artworkId: number, printSize: string) {
    save(items.filter(i => !(i.artworkId === artworkId && i.printSize === printSize)))
  }

  function clear() {
    save([])
  }

  return (
    <CartContext.Provider value={{
      items,
      add,
      remove,
      clear,
      count: items.length,
      has: (artworkId, printSize) => items.some(i => i.artworkId === artworkId && i.printSize === printSize),
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
