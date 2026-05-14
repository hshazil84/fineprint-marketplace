// All draft API calls — uses Bearer token auth

interface DraftPayload {
  type:                'single' | 'variant' | 'bundle'
  series_name:         string
  category:            string
  bundle_price:        number | null
  individual_listings: boolean
  bundle_preview_url:  string | null
}

interface DraftPatchPayload {
  draft_id: string
  pieces?:  any[]
  series_name?:         string
  category?:            string
  bundle_price?:        number | null
  individual_listings?: boolean
  bundle_preview_url?:  string | null
}

function authHeaders(token: string) {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

export async function createDraft(token: string, payload: DraftPayload) {
  const res  = await fetch('/api/artwork/draft', {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to create draft')
  return json.draft
}

export async function updateDraft(token: string, payload: DraftPatchPayload) {
  const res  = await fetch('/api/artwork/draft', {
    method:  'PATCH',
    headers: authHeaders(token),
    body:    JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to update draft')
  return json.draft
}

export async function fetchDrafts(token: string) {
  const res  = await fetch('/api/artwork/draft', {
    headers: authHeaders(token),
  })
  const json = await res.json()
  if (!res.ok) return []
  return json.drafts || []
}

export async function deleteDraft(token: string, draftId: string) {
  await fetch('/api/artwork/draft', {
    method:  'DELETE',
    headers: authHeaders(token),
    body:    JSON.stringify({ draft_id: draftId }),
  })
}
