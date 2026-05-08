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
    return Response.redirect(`${appUrl}/?google=error`, 302)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.VITE_GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return Response.redirect(`${appUrl}/?google=error`, 302)
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const upsertData: Record<string, unknown> = {
    user_id: state,
    provider: 'google',
    access_token: tokens.access_token,
    expires_at: expiresAt,
    scope: tokens.scope,
    updated_at: new Date().toISOString(),
  }

  // Only update refresh_token if we got one (Google only sends it on first auth)
  if (tokens.refresh_token) {
    upsertData.refresh_token = tokens.refresh_token
  }

  await supabase.from('oauth_tokens').upsert(upsertData, { onConflict: 'user_id,provider' })

  return Response.redirect(`${appUrl}/?google=connected`, 302)
}
