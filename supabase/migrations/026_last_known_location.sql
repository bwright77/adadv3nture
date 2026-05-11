-- last_known_location — the resolved place the user was at on most recent
-- client-side useLocation() call. Read by background server processes (e.g.
-- the apple-health-webhook → morning-briefing chain) that have no browser
-- geolocation available.
--
-- Shape:
--   { lat: number, lon: number, name: string,
--     elevation_ft: number | null, resolved_at: ISO-timestamp }

alter table users
  add column if not exists last_known_location jsonb;
