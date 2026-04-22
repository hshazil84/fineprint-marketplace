'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface CartItem {
  artworkId:    number
  artworkSku:   string
  artworkTitle: string
  artistName:   string
  artistId:     string
  printSize:    string
  artistPrice:  number
  printingFee:  number
  offerLabel:   string | null
  offerPct:     number | null
  previewUrl:   string | null
  quantity:     number
}

interface CartContextType {
  items:    CartItem[]
  add:      (item: Omit<CartItem, 'quantity'>) => void
  remove:   (artworkId: number, printSize: string) => void
  setQty:   (artworkId: number, printSize: string, qty: number) => void
  clear:    () => void
  count:    number
  has:      (artworkId: number, printSize: string) => boolean
}

const CartContext = createContext<CartContextType>({
  items:  [],
  add:    () => {},
  remove: () => {},
  setQty: () => {},
  clear:  () => {},
  count:  0,
  has:    () => false,
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

  function add(item: Omit<CartItem, 'quantity'>) {
    setItems(prev => {
      const exists = prev.some(i => i.artworkId === item.artworkId && i.printSize === item.printSize)
      if (exists) return prev
      const next = [...prev, { ...item, quantity: 1 }]
      try { localStorage.setItem('fp_cart', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function remove(artworkId: number, printSize: string) {
    save(items.filter(i => !(i.artworkId === artworkId && i.printSize === printSize)))
  }

  function setQty(artworkId: number, printSize: string, qty: number) {
    if (qty < 1) { remove(artworkId, printSize); return }
    if (qty > 10) return
    save(items.map(i =>
      i.artworkId === artworkId && i.printSize === printSize
        ? { ...i, quantity: qty }
        : i
    ))
  }

  function clear() { save([]) }

  return (
    <CartContext.Provider value={{
      items,
      add,
      remove,
      setQty,
      clear,
      count: items.reduce((s, i) => s + i.quantity, 0),
      has:   (artworkId, printSize) => items.some(i => i.artworkId === artworkId && i.printSize === printSize),
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
