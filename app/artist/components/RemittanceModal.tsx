'use client'
import { formatMVR } from '@/lib/pricing'

export function RemittanceModal({ payout, profile, onClose }: { payout: any, profile: any, onClose: () => void }) {
  const paidAt = payout.paid_at
    ? new Date(payout.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  const rows = [
    ['Payee', profile?.full_name],
    ['Artist code', 'FP-' + profile?.artist_code],
    ['Bank', payout.bank_name],
    ['Account name', payout.account_name],
    ['Account number', payout.account_number],
    ['Amount', 'MVR ' + payout.amount?.toLocaleString()],
    ['Date', paidAt],
    ['Reference', 'PAYOUT-' + payout.id?.slice(0, 8).toUpperCase()],
  ]

  function printRemittance() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Remittance Advice</title>' +
      '<style>body{margin:0;padding:24px;font-family:-apple-system,sans-serif;background:#f0f0ec}' +
      '.wrap{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0ddd6}' +
      '@media print{body{background:#fff}.wrap{border:none;border-radius:0}}</style></head>' +
      '<body><div class="wrap">' +
      '<div style="background:#1a1a1a;padding:24px 32px;display:flex;justify-content:space-between">' +
      '<div><div style="font-size:18px;font-weight:600;color:#fff">FinePrint Studio</div>' +
      '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px">fineprintmv.com</div></div>' +
      '<div style="text-align:right">' +
      '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase">Remittance Advice</div>' +
      '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px">' + paidAt + '</div>' +
      '<div style="margin-top:6px;display:inline-block;background:#EAF3DE;color:#3B6D11;font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px">Paid</div>' +
      '</div></div>' +
      '<div style="padding:24px 32px">' +
      '<div style="background:#f0faf6;border:1px solid #9FE1CB;border-radius:10px;padding:18px;text-align:center;margin-bottom:20px">' +
      '<div style="font-size:11px;color:#1D9E75;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Amount paid</div>' +
      '<div style="font-size:30px;font-weight:600;color:#111">MVR ' + payout.amount?.toLocaleString() + '</div>' +
      '<div style="font-size:12px;color:#888;margin-top:4px">' + paidAt + '</div></div>' +
      '<table style="width:100%;border-collapse:collapse">' +
      rows.map(([k, v]) =>
        '<tr style="border-bottom:1px solid #f4f4f0">' +
        '<td style="padding:9px 0;font-size:13px;color:#888">' + k + '</td>' +
        '<td style="padding:9px 0;font-size:13px;color:#111;text-align:right;font-weight:500">' + v + '</td></tr>'
      ).join('') +
      '</table>' +
      '<p style="font-size:11px;color:#aaa;line-height:1.6;margin-top:16px">This remittance advice confirms payment has been processed by FinePrint Studio.</p>' +
      '</div>' +
      '<div style="background:#f7f7f5;padding:12px 32px;display:flex;justify-content:space-between;border-top:1px solid #e8e8e4">' +
      '<span style="font-size:11px;color:#aaa">FinePrint Studio · Male, Maldives</span>' +
      '<span style="font-size:11px;color:#1D9E75">fineprintmv.com</span></div></div></body></html>'
    )
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#1a1a1a' }}>
          <p style={{ fontSize: 13, color: '#fff' }}>Payout Remittance</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={printRemittance} style={{ background: '#9FE1CB', color: '#085041', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              Print / Save PDF
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ background: '#f0faf6', border: '1px solid #9FE1CB', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Amount paid</p>
            <p style={{ fontSize: 32, fontWeight: 600, color: '#111', margin: 0 }}>{formatMVR(payout.amount)}</p>
            <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>{paidAt}</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #f4f4f0' }}>
                  <td style={{ padding: '9px 0', fontSize: 13, color: '#888' }}>{k}</td>
                  <td style={{ padding: '9px 0', fontSize: 13, color: '#111', textAlign: 'right', fontWeight: 500 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6, margin: 0 }}>
            This remittance advice confirms payment has been processed by FinePrint Studio.
          </p>
        </div>
      </div>
    </div>
  )
}
