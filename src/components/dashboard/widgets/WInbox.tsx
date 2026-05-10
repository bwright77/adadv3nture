import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { getInboxItems, type InboxItem } from '../../../lib/inbox'
import { useAuth } from '../../../contexts/AuthContext'

interface WInboxProps { dark?: boolean; span?: number }

function sinceLastNight(items: InboxItem[]): number {
  const cutoff = new Date()
  cutoff.setHours(18, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - 1)
  return items.filter(i => new Date(i.captured_at) >= cutoff).length
}

export function WInbox({ dark, span = 6 }: WInboxProps) {
  const { user } = useAuth()
  const [items, setItems] = useState<InboxItem[]>([])

  useEffect(() => {
    if (!user) return
    getInboxItems(user.id).then(setItems).catch(() => null)
  }, [user])

  const count = items.length
  const recent = sinceLastNight(items)
  const latest = items[0]

  return (
    <Glass dark={dark} span={span} pad={14}>
      <CardLabel dark={dark}>Inbox · captured</CardLabel>
      <div className="mono" style={{ fontSize: 'var(--fs-26)', fontWeight: 700, lineHeight: 1, fontFeatureSettings: '"zero" 0' }}>
        {count}
      </div>
      {recent > 0 && (
        <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.55, marginTop: 2 }}>
          {recent} from last night
        </div>
      )}
      {latest && (
        <div style={{ marginTop: 8, fontSize: 'var(--fs-12)', opacity: 0.7, fontStyle: 'italic', lineHeight: 1.4 }}>
          "{latest.content.length > 48 ? latest.content.slice(0, 48) + '…' : latest.content}"
        </div>
      )}
      {!latest && count === 0 && (
        <div style={{ marginTop: 8, fontSize: 'var(--fs-12)', opacity: 0.45, lineHeight: 1.4 }}>
          Clear inbox.
        </div>
      )}
    </Glass>
  )
}
