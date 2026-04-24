import { useState, useMemo } from 'react'

export const PAGE_SIZES = {
  orders:   20,
  listings: 15,
  artists:  20,
}

export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  // Reset to page 1 if items change and current page is out of range
  const safePage = Math.min(page, totalPages)

  const paginated = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  )

  function handlePage(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return {
    page:       safePage,
    setPage:    handlePage,
    totalPages,
    paginated,
    hasNext:    safePage < totalPages,
    hasPrev:    safePage > 1,
    startIndex: (safePage - 1) * pageSize + 1,
    endIndex:   Math.min(safePage * pageSize, items.length),
    total:      items.length,
  }
}
