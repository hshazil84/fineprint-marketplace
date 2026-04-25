'use client'

import { useState } from 'react'

interface Props {
  currentStatus: string
  onClose: () => void
  onStatusChange: (status: string) => void
}

export default function WithdrawalModal({ currentStatus, onClose, onStatusChange }: Props) {
  const [step, setStep] = useState<'choose' | 'confirm_pause' | 'confirm_withdraw'>('choose')
  const [loading, setLoading] = useState(false)

  const handleAction = async (action: 'pause' | 'unpause' | 'request_withdrawal') => {
    setLoading(true)
    const res = await fetch('/api/artist/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      onStatusChange(data.status)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Account options</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Step: Choose */}
        {step === 'choose' && (
          <div className="space-y-3">
            <p className="text-white/60 text-sm mb-4">
              Choose how you'd like to manage your FinePrint account.
            </p>

            {currentStatus === 'active' && (
              <button
                onClick={() => setStep('confirm_pause')}
                className="w-full text-left px-4 py-4 rounded-xl border border-white/10 hover:border-yellow-500/40 hover:bg-yellow-500/5 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">⏸</span>
                  <div>
                    <p className="text-white font-medium text-sm">Pause account</p>
                    <p className="text-white/50 text-xs mt-0.5">
                      Temporarily hide your listings. You can unpause anytime.
                    </p>
                  </div>
                </div>
              </button>
            )}

            {currentStatus === 'paused' && (
              <button
                onClick={() => handleAction('unpause')}
                disabled={loading}
                className="w-full text-left px-4 py-4 rounded-xl border border-white/10 hover:border-green-500/40 hover:bg-green-500/5 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">▶️</span>
                  <div>
                    <p className="text-white font-medium text-sm">Unpause account</p>
                    <p className="text-white/50 text-xs mt-0.5">
                      Reactivate your listings and resume selling.
                    </p>
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={() => setStep('confirm_withdraw')}
              className="w-full text-left px-4 py-4 rounded-xl border border-white/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">🚪</span>
                <div>
                  <p className="text-white font-medium text-sm">Withdraw from FinePrint</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    Permanently deactivate your account. Requires admin approval.
                  </p>
                </div>
              </div>
            </button>

            <button onClick={onClose} className="w-full text-center text-white/40 hover:text-white text-sm py-2 transition-colors">
              Cancel
            </button>
          </div>
        )}

        {/* Step: Confirm Pause */}
        {step === 'confirm_pause' && (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-yellow-400 text-sm font-medium mb-1">⏸ Pausing your account</p>
              <p className="text-white/60 text-sm">
                All your listings will be hidden from the storefront. No new orders can be placed. You can unpause at any time from your dashboard.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('choose')}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => handleAction('pause')}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Pausing…' : 'Confirm pause'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirm Withdraw */}
        {step === 'confirm_withdraw' && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-400 text-sm font-medium mb-1">🚪 Withdrawing from FinePrint</p>
              <p className="text-white/60 text-sm">
                Your request will be sent to the admin for review. Once approved, your account and all listings will be permanently deactivated.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('choose')}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => handleAction('request_withdrawal')}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
