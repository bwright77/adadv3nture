import { useStrava } from '../hooks/useStrava'
import { C } from '../tokens'

function formatPace(secondsPerMile: number | null): string {
  if (!secondsPerMile) return '—'
  const m = Math.floor(secondsPerMile / 60)
  const s = secondsPerMile % 60
  return `${m}:${String(s).padStart(2, '0')}/mi`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const TYPE_ICON: Record<string, string> = {
  run: '🏃', ride: '🚴', strength: '🏋️', workout: '💪',
  hike: '🥾', walk: '🚶', swim: '🏊', yoga: '🧘',
}

export function LogPage() {
  const { connected, syncing, syncCount, activities, connect, sync } = useStrava()

  return (
    <div style={{ padding: '20px 16px 100px', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="badge" style={{ fontSize: 22, color: C.dark }}>ACTIVITY LOG</div>
        <div style={{ fontSize: 13, color: C.ink60, marginTop: 4 }}>Strava sync · last 90 days</div>
      </div>

      {/* Connection status */}
      <div style={{
        background: connected === true ? 'rgba(91,188,184,0.1)' : 'rgba(196,82,42,0.08)',
        border: `1px solid ${connected === true ? C.teal : C.ink20}`,
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
            {connected === null ? 'Checking Strava…'
              : connected ? '✓ Strava connected'
              : 'Strava not connected'}
          </div>
          {syncCount !== null && (
            <div style={{ fontSize: 11, color: C.ink60, marginTop: 2 }}>
              Synced {syncCount} activities
            </div>
          )}
        </div>
        {connected === true ? (
          <button
            onClick={sync}
            disabled={syncing}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: syncing ? C.sandLt : C.teal,
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: syncing ? 'not-allowed' : 'pointer',
            }}
          >
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        ) : connected === false ? (
          <button
            onClick={connect}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: C.rust,
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Connect Strava
          </button>
        ) : null}
      </div>

      {/* Activity list */}
      {activities.length === 0 && connected === true && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.ink60, fontSize: 13 }}>
          No activities yet — tap Sync to load your history.
        </div>
      )}

      {activities.map(a => (
        <div key={a.id} style={{
          background: 'white',
          borderRadius: 14,
          padding: '12px 14px',
          marginBottom: 10,
          border: `1px solid ${C.ink20}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{TYPE_ICON[a.activity_type] ?? '⚡'}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{a.title}</span>
              </div>
              <div className="mono" style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 10, color: C.ink60 }}>
                {a.distance_miles && <span>{a.distance_miles.toFixed(1)} mi</span>}
                {a.duration_seconds && <span>{formatDuration(a.duration_seconds)}</span>}
                {a.avg_pace_seconds_per_mile && a.activity_type === 'run' && (
                  <span>{formatPace(a.avg_pace_seconds_per_mile)}</span>
                )}
                {a.avg_hr && <span>{a.avg_hr} bpm</span>}
                {a.elevation_feet && <span>+{a.elevation_feet.toLocaleString()} ft</span>}
              </div>
            </div>
            <div className="mono" style={{ fontSize: 10, color: C.ink40, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {new Date(a.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
