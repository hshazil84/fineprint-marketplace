'use client'

interface PaginationProps {
  page:       number
  totalPages: number
  total:      number
  startIndex: number
  endIndex:   number
  onPage:     (p: number) => void
}

export function Pagination({ page, totalPages, total, startIndex, endIndex, onPage }: PaginationProps) {
  if (totalPages <= 1) return null

  function getPages(): (number | '...')[] {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  const btn: React.CSSProperties = {
    minWidth: 32, height: 32, borderRadius: 8,
    border: '0.5px solid var(--color-border)',
    background: 'transparent', cursor: 'pointer',
    fontSize: 12, color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 24 }}>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
        Showing {startIndex}–{endIndex} of {total}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          style={{ ...btn, opacity: page === 1 ? 0.35 : 1, padding: '0 10px' }}
        >←</button>

        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={'e' + i} style={{ minWidth: 32, textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              style={{
                ...btn,
                background:  page === p ? '#1a1a1a' : 'transparent',
                color:       page === p ? '#fff' : 'var(--color-text)',
                borderColor: page === p ? '#1a1a1a' : 'var(--color-border)',
                fontWeight:  page === p ? 500 : 400,
              }}
            >{p}</button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          style={{ ...btn, opacity: page === totalPages ? 0.35 : 1, padding: '0 10px' }}
        >→</button>
      </div>
    </div>
  )
}
