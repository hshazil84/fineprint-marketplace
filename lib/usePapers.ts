import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export interface PaperOption {
  id:                  number
  paper_id:            string
  name:                string
  category:            'Standard' | 'Premium'
  description:         string
  addOn:               Record<string, number>
  in_stock:            boolean
  stock_status:        string
  stock_qty_a4:        number
  stock_qty_a3:        number
  stock_qty_a2:        number
  stock_low_threshold: number
  weight_gsm:          number | null
  barcode:             string | null
  images:              string[]
  datasheet_url:       string | null
  best_for:            string[]
}

// Map artwork categories to best_for keys
export const CATEGORY_TO_BEST_FOR: Record<string, string> = {
  'Photography':       'photography',
  'Digital Art':       'digital_art',
  'Fine Art':          'fine_art',
  'Abstract':          'fine_art',
  'Watercolour':       'watercolour',
  'Illustration':      'illustration',
  'Mixed Media':       'fine_art',
  'Charcoal & Sketch': 'charcoal',
}

export const BEST_FOR_LABELS: Record<string, string> = {
  photography:  'Photography',
  digital_art:  'Digital Art',
  fine_art:     'Fine Art',
  watercolour:  'Watercolour',
  illustration: 'Illustration',
  charcoal:     'Charcoal & Sketch',
}

export function usePapers() {
  const [papers, setPapers]   = useState<PaperOption[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('papers')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        const mapped: PaperOption[] = (data || []).map(p => ({
          id:                  p.id,
          paper_id:            p.paper_id,
          name:                p.name,
          category:            (p.add_on_a4 > 0 || p.add_on_a3 > 0) ? 'Premium' : 'Standard',
          description:         p.description || '',
          addOn: {
            A4:      p.add_on_a4 || 0,
            A3:      p.add_on_a3 || 0,
            A2:      p.add_on_a2 || 0,
            '12x16': 0,
          },
          in_stock:            p.stock_status !== 'out_of_stock',
          stock_status:        p.stock_status,
          stock_qty_a4:        p.stock_qty_a4 || 0,
          stock_qty_a3:        p.stock_qty_a3 || 0,
          stock_qty_a2:        p.stock_qty_a2 || 0,
          stock_low_threshold: p.stock_low_threshold || 10,
          weight_gsm:          p.weight_gsm || null,
          barcode:             p.barcode || null,
          images:              p.images || [],
          datasheet_url:       p.datasheet_url || null,
          best_for:            p.best_for || [],
        }))
        setPapers(mapped)
        setLoading(false)
      })
  }, [])

  function getPapersByCategory(): Record<string, PaperOption[]> {
    return papers.reduce((acc, paper) => {
      if (!acc[paper.category]) acc[paper.category] = []
      acc[paper.category].push(paper)
      return acc
    }, {} as Record<string, PaperOption[]>)
  }

  function getPaperAddOn(paperName: string, size: string): number {
    const paper = papers.find(p => p.name === paperName)
    if (!paper) return 0
    return paper.addOn[size] ?? 0
  }

  function getDefaultPaper(artworkCategory?: string): string {
    if (artworkCategory && papers.length > 0) {
      const bestForKey = CATEGORY_TO_BEST_FOR[artworkCategory]
      if (bestForKey) {
        const match = papers.find(p =>
          p.in_stock &&
          p.best_for.includes(bestForKey) &&
          p.category === 'Standard'
        )
        if (match) return match.name
      }
    }
    // fallback to first in-stock standard paper
    const fallback = papers.find(p => p.in_stock && p.category === 'Standard')
    return fallback?.name || ''
  }

  function getRecommendedPaper(artworkCategory: string): PaperOption | null {
    const bestForKey = CATEGORY_TO_BEST_FOR[artworkCategory]
    if (!bestForKey) return null
    return papers.find(p => p.in_stock && p.best_for.includes(bestForKey)) || null
  }

  return {
    papers,
    loading,
    getPapersByCategory,
    getPaperAddOn,
    getDefaultPaper,
    getRecommendedPaper,
  }
}
