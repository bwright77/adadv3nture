const MORNING_HOUR = 6  // same cutoff as useTimeOfDay MORNING_START_MINS

/** Returns the logical "today" date as YYYY-MM-DD in local time.
 *  Before 6am counts as the previous day so late-night entries stay on the right day. */
export function logicalToday(): string {
  const now = new Date()
  if (now.getHours() < MORNING_HOUR) {
    now.setDate(now.getDate() - 1)
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
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
