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

  if (!tokenRes.ok) {
    return new Response(JSON.stringify({ error: 'Refresh failed' }), { status: 401 })
  }

  const json = await tokenRes.json() as {
    status: number
    body: { access_token: string; refresh_token: string; expires_in: number }
  }

  if (json.status !== 0) {
    return new Response(JSON.stringify({ error: `Withings error ${json.status}` }), { status: 401 })
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
