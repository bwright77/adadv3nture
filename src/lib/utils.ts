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
