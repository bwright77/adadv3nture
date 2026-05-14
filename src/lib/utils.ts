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

/** True when the given ISO timestamp falls inside the current logical-today
 *  window — from 6am of `logicalToday()` to 6am the next calendar day, both
 *  evaluated in America/Denver. Use this for "did this happen today?"
 *  questions when you have an event's exact start_time and want late-night
 *  bleed-over (e.g. an 11pm Tuesday workout AND a 12:30am Wednesday workout
 *  both count as "Tuesday's BODY MIT" if logicalToday is Tuesday). */
export function isInLogicalToday(isoTimestamp: string | null | undefined): boolean {
  if (!isoTimestamp) return false
  const t = new Date(isoTimestamp)
  if (!isFinite(t.getTime())) return false

  // Render the timestamp in Denver as a string we can lexicographically order.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(t).map(p => [p.type, p.value]))
  const denverHour = parseInt(parts.hour, 10) % 24
  const denverStamp = `${parts.year}-${parts.month}-${parts.day}T${String(denverHour).padStart(2, '0')}:${parts.minute}`

  // Window bounds: [today @ 6am, tomorrow @ 6am)
  const today = logicalToday()
  const next = new Date(today + 'T12:00:00Z')
  next.setUTCDate(next.getUTCDate() + 1)
  const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`

  const startBound = `${today}T${String(MORNING_HOUR).padStart(2, '0')}:00`
  const endBound = `${nextDate}T${String(MORNING_HOUR).padStart(2, '0')}:00`

  return denverStamp >= startBound && denverStamp < endBound
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
