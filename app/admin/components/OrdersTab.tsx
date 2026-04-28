'use client'
import { useState } from 'react'
import { formatMVR } from '@/lib/pricing'
import { usePagination, PAGE_SIZES } from '@/lib/pagination'
import { Pagination } from '@/app/components/Pagination'

export function ArtistOrdersTab({ activeOrders, rejectedOrders, onViewInvoice }: any) {
  const [search, setSearch]     = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const filteredActive = activeOrders.filter((o: any) =>
    !search ||
    o.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.order_sku?.toLowerCase().includes(search.toLowerCase()) ||
    o.artworks?.title?.toLowerCase().includes(search.toLowerCase())
  )

  const { paginated, page, setPage, totalPages, startIndex, endIndex, total } = usePagination(filteredActive, PAGE_SIZES.orders)

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="Search invoice, SKU, artwork..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, fontSize: 13 }}
        />
        {search && <button className="btn btn-sm" onClick={() => setSearch('')}>Clear ×</button>}

        {/* View toggle */}
        <div style={{ display: 'flex', border: '0.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <button
            onClick={() => setViewMode('list')}
            style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 13, background: viewMode === 'list' ? '#1a1a1a' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--color-text-muted)' }}
            title="List view"
          >☰</button>
          <button
            onClick={() => setViewMode('grid')}
            style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 13, background: viewMode === 'grid' ? '#1a1a1a' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--color-text-muted)' }}
            title="Grid view"
          >⊞</button>
        </div>
      </div>

      {/* List view */}
      {viewMode === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          {paginated.length === 0 ? (
            <p style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              {filteredActive.length === 0 && activeOrders.length > 0 ? 'No orders match your search.' : 'No orders yet.'}
            </p>
          ) : paginated.map((o: any) => {
            const myItems     = o.myItems || []
            const isMultiItem = myItems.length > 0
            const title       = isMultiItem ? myItems.map((i: any) => i.artworks?.title).join(', ') : o.artworks?.title
            const sizeLabel   = isMultiItem ? myItems.map((i: any) => i.print_size).join(', ') : o.print_size
            return (
              <div key={o.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--color-border)', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{title} — {sizeLabel}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {o.invoice_number} · {new Date(o.created_at).toLocaleDateString()}
                  </p>
                  <span className="sku-tag" style={{ marginTop: 4, display: 'inline-block' }}>{o.order_sku}</span>
                  {o.status === 'approved' && (
                    <button className="btn btn-sm" style={{ marginTop: 6, fontSize: 11, display: 'block' }} onClick={() => onViewInvoice(o)}>
                      View invoice
                    </button>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={'badge badge-' + o.status}>{o.status}</span>
                  <p style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{formatMVR(o.artist_earnings)}</p>
                  {isMultiItem && (
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {myItems.length} item{myItems.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          {paginated.length === 0 ? (
            <p style={{ gridColumn: '1/-1', padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              {filteredActive.length === 0 && activeOrders.length > 0 ? 'No orders match your search.' : 'No orders yet.'}
            </p>
          ) : paginated.map((o: any) => {
            const myItems     = o.myItems || []
            const isMultiItem = myItems.length > 0
            const title       = isMultiItem ? myItems.map((i: any) => i.artworks?.title).join(', ') : o.artworks?.title
            const sizeLabel   = isMultiItem ? myItems.map((i: any) => i.print_size).join(', ') : o.print_size
            const preview     = o.artworks?.preview_url
            return (
              <div key={o.id} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Thumbnail */}
                <div style={{ position: 'relative', aspectRatio: '1/1', background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                  {preview ? (
                    <img src={preview} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 24 }}>🖼</div>
                  )}
                  <span className={'badge badge-' + o.status} style={{ position: 'absolute', top: 6, left: 6, fontSize: 9 }}>{o.status}</span>
                </div>

                {/* Info */}
                <div style={{ padding: '10px 10px 6px', flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 500, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: '0 0 2px' }}>{sizeLabel}</p>
                  <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>{formatMVR(o.artist_earnings)}</p>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>{new Date(o.created_at).toLocaleDateString()}</p>
                </div>

                {/* Action */}
                {o.status === 'approved' && (
                  <div style={{ padding: '0 10px 10px' }}>
                    <button className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px', width: '100%' }} onClick={() => onViewInvoice(o)}>
                      View invoice
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} startIndex={startIndex} endIndex={endIndex} onPage={setPage} />

      {/* Rejected orders */}
      {rejectedOrders.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#A32D2D', marginBottom: 10 }}>
            Rejected orders
            <span style={{ fontWeight: 400, color: '#A32D2D', fontSize: 12, marginLeft: 6 }}>· payment could not be verified</span>
          </p>
          <div style={{ border: '0.5px solid #F09595', borderRadius: 12, overflow: 'hidden' }}>
            {rejectedOrders.map((o: any) => {
              const myItems     = o.myItems || []
              const isMultiItem = myItems.length > 0
              const title       = isMultiItem ? myItems.map((i: any) => i.artworks?.title).join(', ') : o.artworks?.title
              const sizeLabel   = isMultiItem ? myItems.map((i: any) => i.print_size).join(', ') : o.print_size
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid #F09595', background: '#FCEBEB', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#A32D2D' }}>{title} — {sizeLabel}</p>
                    <p style={{ fontSize: 12, color: '#A32D2D', marginTop: 2, opacity: 0.7 }}>
                      {o.invoice_number} · {new Date(o.created_at).toLocaleDateString()}
                    </p>
                    <span className="sku-tag" style={{ marginTop: 4, display: 'inline-block' }}>{o.order_sku}</span>
                    <p style={{ fontSize: 11, color: '#A32D2D', marginTop: 6, lineHeight: 1.5 }}>
                      Payment could not be verified. Contact{' '}
                      <a href="mailto:hello@fineprintmv.com" style={{ color: '#A32D2D' }}>hello@fineprintmv.com</a>
                      {' '}if you think this is a mistake.
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="badge badge-rejected">rejected</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
