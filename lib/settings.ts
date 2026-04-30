import { createClient } from '@/lib/supabase'

export interface PricingSettings {
  platformFeePct:    number
  handlingFee:       number
  printingFees:      Record<string, number>
}

// Cache settings in memory for the duration of the request
let cachedSettings: PricingSettings | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getPricingSettings(): Promise<PricingSettings> {
  const now = Date.now()
  if (cachedSettings && now - cacheTime < CACHE_TTL) return cachedSettings

  const supabase = createClient()
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')

  if (error || !data) {
    // Fallback to hardcoded defaults if DB fails
    return {
      platformFeePct: 5,
      handlingFee:    100,
      printingFees: {
        'A4':    200,
        'A3':    350,
        'A2':    500,
        '12x16': 350,
      },
    }
  }

  const map: Record<string, string> = {}
  data.forEach(row => { map[row.key] = row.value })

  cachedSettings = {
    platformFeePct: parseFloat(map['platform_fee_pct'] || '5'),
    handlingFee:    parseInt(map['handling_fee']       || '100'),
    printingFees: {
      'A4':    parseInt(map['printing_fee_a4']    || '200'),
      'A3':    parseInt(map['printing_fee_a3']    || '350'),
      'A2':    parseInt(map['printing_fee_a2']    || '500'),
      '12x16': parseInt(map['printing_fee_12x16'] || '350'),
    },
  }
  cacheTime = now
  return cachedSettings
}

// Synchronous version using hardcoded defaults
// Use this in client components — call getPricingSettings() in server/API routes
export const DEFAULT_PRINTING_FEES: Record<string, number> = {
  'A4':    200,
  'A3':    350,
  'A2':    500,
  '12x16': 350,
}
export const DEFAULT_PLATFORM_FEE_PCT = 5
export const DEFAULT_HANDLING_FEE     = 100
