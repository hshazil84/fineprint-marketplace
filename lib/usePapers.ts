import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export interface PaperOption {
  id:           number
  paper_id:     string
  name:         string
  category:     'Standard' | 'Premium'
  description:  string
  addOn:        Record<string, number>
  in_stock:     boolean
  stock_status: string
  images:       string[]
  datasheet_url: string | null
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
          id:           p.id,
          paper_id:     p.paper_id,
          name:         p.name,
          category:     (p.add_on_a4 > 0 || p.add_on_a3 > 0) ? 'Premium' : 'Standard',
          description:  p.description || '',
          addOn: {
            A4:      p.add_on_a4 || 0,
            A3:      p.add_on_a3 || 0,
            A2:      p.add_on_a2 || 0,
            '12x16': 0,
          },
          in_stock:     p.stock_status !== 'out_of_stock',
          stock_status: p.stock_status,
          images:       p.images || [],
          datasheet_url: p.datasheet_url,
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

  function getDefaultPaper(): string {
    const first = papers.find(p => p.stock_status === 'in_stock' && p.category === 'Standard')
    return first?.name || ''
  }

  return { papers, loading, getPapersByCategory, getPaperAddOn, getDefaultPaper }
}
