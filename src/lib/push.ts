import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const out = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i)
  return out
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  if (!VAPID_PUBLIC_KEY) {
    console.error('VITE_VAPID_PUBLIC_KEY is not set — generate one with `npx web-push generate-vapid-keys`')
    return null
  }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()

  if (!sub) {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = sub.toJSON()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      user_agent: navigator.userAgent,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )

  return sub
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await sub.unsubscribe()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
}
