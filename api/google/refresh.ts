import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { userId } = await req.json() as { userId: string }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data } = await supabase
    .from('oauth_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle() as { data: { refresh_token: string } | null }

  if (!data?.refresh_token) {
    return new Response(JSON.stringify({ error: 'No refresh token' }), { status: 400 })
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: data.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return new Response(JSON.stringify({ error: 'Refresh failed' }), { status: 400 })

  const tokens = await res.json() as { access_token: string; expires_in: number }
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('oauth_tokens').update({
    access_token: tokens.access_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('provider', 'google')

  return new Response(JSON.stringify({ access_token: tokens.access_token }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
