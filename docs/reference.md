# Reference

## API Integrations

**Strava:** OAuth2 `activity:read_all` · webhook + paginated backfill
**Withings Body Comp:** OAuth2 · `POST /measure?action=getmeas` · webhook
**Google Calendar:** OAuth2 `calendar.events` · read + write · separate OAuth (not Supabase Google token)
**OpenWeatherMap:** geolocation-first · Denver fallback `39.7392, -104.9903` · Howard `38.4192, -105.8283`
**Apple Health:** Health Auto Export → `/functions/v1/apple-health-webhook` · historic export on setup · nulls handled gracefully
**Anthropic:** claude-sonnet-4-6 · server-side Edge Function only · never expose key to client

## Environment Variables

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
VITE_STRAVA_REDIRECT_URI=
WITHINGS_CLIENT_ID=
WITHINGS_CLIENT_SECRET=
VITE_WITHINGS_REDIRECT_URI=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
VITE_GOOGLE_REDIRECT_URI=
VITE_OPENWEATHER_API_KEY=
ANTHROPIC_API_KEY=          # server-side ONLY
```

## File Structure

```
adadv3nture/
├── CLAUDE.md
├── docs/
│   ├── apple-health-setup.md
│   ├── design-system.md
│   ├── intelligence.md
│   ├── reference.md
│   ├── schema.md
│   └── user-context.md
├── public/
│   └── adadv3nture.png
├── src/
│   ├── components/
│   │   ├── widgets/
│   │   ├── dashboard/
│   │   ├── inbox/
│   │   ├── todos/
│   │   ├── trends/
│   │   ├── inspiration/
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── types/
│   └── main.tsx
├── supabase/
│   ├── migrations/
│   └── functions/
│       ├── apple-health-webhook/
│       ├── strava-webhook/
│       ├── withings-webhook/
│       ├── weekly-summaries/
│       ├── morning-briefing/
│       └── photo-thumbnail/
└── .env.local
```

## DB Operations

- **Apply migrations:** `npx supabase db push` (no Docker, connects remote directly)
- **Query remote DB for debugging:** Node script + `@supabase/supabase-js` + `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`
- **Never use:** `supabase start`, local stack, or anon key for server-side queries
