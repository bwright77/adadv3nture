const MORNING_HOUR = 6  // same cutoff as useTimeOfDay MORNING_START_MINS
const APP_TIMEZONE = 'America/Denver'

/** Returns the logical "today" date as YYYY-MM-DD in the app's timezone
 *  (America/Denver), NOT the browser's local timezone.
 *  Before 6am counts as the previous day so late-night entries stay on the right day.
 *
 *  Why this is timezone-pinned: a browser whose Date object reports any
 *  zone east of about UTC+5 — including some misconfigured devices and
 *  cloud-IDE / dev tunnels — turns Sunday 7pm Denver into Monday past 6am
 *  local. That used to leak Sunday entries onto Monday's plan_date. */
export function logicalToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const get = (type: string): string =>
    parts.find(p => p.type === type)?.value ?? ''

  let year = parseInt(get('year'), 10)
  let month = parseInt(get('month'), 10)
  let day = parseInt(get('day'), 10)
  // Intl can emit `24` for midnight in en-CA — treat as 0.
  const hour = parseInt(get('hour'), 10) % 24

  if (hour < MORNING_HOUR) {
    const d = new Date(Date.UTC(year, month - 1, day))
    d.setUTCDate(d.getUTCDate() - 1)
    year = d.getUTCFullYear()
    month = d.getUTCMonth() + 1
    day = d.getUTCDate()
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

/** "May 1st, 2017" from a YYYY-MM-DD string */
export function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const month = d.toLocaleDateString('en-US', { month: 'long' })
  return `${month} ${ordinalSuffix(d.getDate())}, ${d.getFullYear()}`
}
