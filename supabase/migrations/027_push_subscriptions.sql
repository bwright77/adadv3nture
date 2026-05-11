-- push_subscriptions — one row per browser/PWA install that opted into
-- briefing notifications. Each row stores the endpoint + the keys the
-- VAPID server needs to encrypt the push request.
-- Inserted by the client after pushManager.subscribe(); read by the
-- apple-health-webhook chain to send the post-wake briefing push.

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz default now(),
  last_used_at timestamptz,
  unique(endpoint)
);

create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "owner only" on push_subscriptions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
