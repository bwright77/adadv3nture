import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')   // supabase user_id
  const error = url.searchParams.get('error')

  const appUrl = 'https://adadv3ntures.vercel.app'

  if (error || !code || !state) {
    return Response.redirect(`${appUrl}/?withings=error`, 302)
  }

  // Exchange code for tokens
  const body = new URLSearchParams({
    action: 'requesttoken',
    client_id: process.env.WITHINGS_CLIENT_ID!,
    client_secret: process.env.WITHINGS_CLIENT_SECRET!,
    code,
    grant_type: 'authorization_code',
    redirect_uri: process.env.VITE_WITHINGS_REDIRECT_URI!,
  })

  const tokenRes = await fetch('https://wbsapi.withings.net/v2/oauth2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!tokenRes.ok) {
    return Response.redirect(`${appUrl}/?withings=error`, 302)
  }

  const json = await tokenRes.json() as {
    status: number
    body: {
      access_token: string
      refresh_token: string
      expires_in: number
      scope: string
    }
  }

  if (json.status !== 0) {
    return Response.redirect(`${appUrl}/?withings=error`, 302)
  }

  const tokens = json.body

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(state)
  if (authUser) {
    await supabase.from('users').upsert({
      id: authUser.id,
      email: authUser.email ?? '',
      name: authUser.user_metadata?.full_name ?? null,
    }, { onConflict: 'id' })
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('oauth_tokens').upsert({
    user_id: state,
    provider: 'withings',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    scope: tokens.scope,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' })

  return Response.redirect(`${appUrl}/?withings=connected`, 302)
}
