import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { userId } = await req.json() as { userId: string }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: token } = await supabase
    .from('oauth_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .eq('provider', 'withings')
    .single()

  if (!token) {
    return new Response(JSON.stringify({ error: 'No token found' }), { status: 404 })
  }

  const body = new URLSearchParams({
    action: 'refreshaccesstoken',
    client_id: process.env.WITHINGS_CLIENT_ID!,
    client_secret: process.env.WITHINGS_CLIENT_SECRET!,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token',
  })

  const tokenRes = await fetch('https://wbsapi.withings.net/v2/oauth2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  // Distinguish transient errors (network, rate limits, 5xx) from terminal
  // ones (refresh-token chain dead). The client uses HTTP 401 as the only
  // signal to nuke the local oauth row — anything else keeps the connection.
  if (!tokenRes.ok) {
    return new Response(JSON.stringify({ error: 'Refresh failed (transient)' }), { status: 503 })
  }

  const json = await tokenRes.json() as {
    status: number
    body: { access_token: string; refresh_token: string; expires_in: number }
  }

  // Withings JSON status codes: 100/101/102 = invalid params/token; 401 =
  // unauthorized — these mean the refresh token is dead, disconnect. Anything
  // else non-zero is transient (rate limit 213/214/215/216/217, server 503, etc.).
  if ([100, 101, 102, 401].includes(json.status)) {
    return new Response(JSON.stringify({ error: `Withings refresh expired (${json.status})` }), { status: 401 })
  }
  if (json.status !== 0) {
    return new Response(JSON.stringify({ error: `Withings transient error ${json.status}` }), { status: 503 })
  }

  const tokens = json.body
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('oauth_tokens').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('provider', 'withings')

  return new Response(JSON.stringify({ access_token: tokens.access_token }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
