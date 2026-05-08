import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')   // supabase user_id
  const error = url.searchParams.get('error')

  const appUrl = process.env.VITE_SUPABASE_URL
    ? 'https://adadv3ntures.vercel.app'
    : 'http://localhost:5173'

  if (error || !code || !state) {
    return Response.redirect(`${appUrl}/?strava=error`, 302)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return Response.redirect(`${appUrl}/?strava=error`, 302)
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token: string
    expires_at: number
    scope: string
  }

  // Store tokens using service role (bypasses RLS)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Ensure public.users row exists before inserting oauth_tokens (FK dependency)
  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(state)
  if (authUser) {
    await supabase.from('users').upsert({
      id: authUser.id,
      email: authUser.email ?? '',
      name: authUser.user_metadata?.full_name ?? null,
    }, { onConflict: 'id' })
  }

  await supabase.from('oauth_tokens').upsert({
    user_id: state,
    provider: 'strava',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    scope: tokens.scope,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' })

  return Response.redirect(`${appUrl}/?strava=connected`, 302)
}
