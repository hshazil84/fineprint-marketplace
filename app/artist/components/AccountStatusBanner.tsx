'use client'

interface Props {
  status: string
  onManage: () => void
}

export default function AccountStatusBanner({ status, onManage }: Props) {
  if (status === 'active') return null

  const config = {
    paused: {
      bg: 'bg-yellow-500/10 border-yellow-500/20',
      text: 'text-yellow-400',
      icon: '⏸',
      message: 'Your account is paused. Your listings are hidden from the storefront.',
      action: 'Unpause account',
    },
    pending_withdrawal: {
      bg: 'bg-orange-500/10 border-orange-500/20',
      text: 'text-orange-400',
      icon: '⏳',
      message: 'Your withdrawal request is pending admin review.',
      action: null,
    },
    withdrawn: {
      bg: 'bg-red-500/10 border-red-500/20',
      text: 'text-red-400',
      icon: '🚪',
      message: 'Your account has been withdrawn. All listings are deactivated.',
      action: null,
    },
  }[status]

  if (!config) return null

  return (
    <div className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-4 mb-6 ${config.bg}`}>
      <div className="flex items-center gap-2">
        <span>{config.icon}</span>
        <p className={`text-sm ${config.text}`}>{config.message}</p>
      </div>
      {config.action && (
        <button
          onClick={onManage}
          className="text-xs text-white/70 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
        >
          {config.action}
        </button>
      )}
    </div>
  )
}
