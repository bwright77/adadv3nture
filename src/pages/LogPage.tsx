import { useStrava } from '../hooks/useStrava'
import { useWithings } from '../hooks/useWithings'
import { C } from '../tokens'
import { BriefingVoiceCard } from '../components/log/BriefingVoiceCard'
import { PushOptInCard } from '../components/log/PushOptInCard'

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

function ConnectCard({
  label, connected, syncing, syncCount, onConnect, onSync, syncLabel = 'Sync',
}: {
  label: string
  connected: boolean | null
  syncing: boolean
  syncCount: number | null
  onConnect: () => void
  onSync: () => void
  syncLabel?: string
}) {
  return (
    <div style={{
      background: connected === true ? 'rgba(91,188,184,0.1)' : 'rgba(196,82,42,0.08)',
      border: `1px solid ${connected === true ? C.teal : C.ink20}`,
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: 'var(--fs-15)', fontWeight: 600, color: C.dark }}>
          {connected === null ? `Checking ${label}…`
            : connected ? `✓ ${label} connected`
            : `${label} not connected`}
        </div>
        {syncCount !== null && (
          <div style={{ fontSize: 'var(--fs-13)', color: C.ink60, marginTop: 2 }}>
            Synced {syncCount} {syncLabel === 'Sync' ? 'records' : syncLabel.toLowerCase()}
          </div>
        )}
      </div>
      {connected === true ? (
        <button
          onClick={onSync}
          disabled={syncing}
          style={{
            padding: '8px 14px', borderRadius: 8,
            background: syncing ? C.sandLt : C.teal,
            color: 'white', fontSize: 'var(--fs-14)', fontWeight: 600,
            border: 'none', cursor: syncing ? 'not-allowed' : 'pointer',
          }}
        >
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      ) : connected === false ? (
        <button
          onClick={onConnect}
          style={{
            padding: '8px 14px', borderRadius: 8,
            background: C.rust, color: 'white',
            fontSize: 'var(--fs-14)', fontWeight: 600,
            border: 'none', cursor: 'pointer',
          }}
        >
          Connect {label}
        </button>
      ) : null}
    </div>
  )
}

interface LogPageProps { onDataSynced?: () => void }

export function LogPage({ onDataSynced }: LogPageProps = {}) {
  const strava = useStrava()
  const withings = useWithings()

  const latestMetric = withings.metrics[0]

  // Each sync runs its own hook; after either completes, tell the parent
  // so anything reading activities or body_metrics (TrendsPage today)
  // can refetch.
  async function handleStravaSync() {
    await strava.sync()
    onDataSynced?.()
  }
  async function handleWithingsSync() {
    await withings.sync()
    onDataSynced?.()
  }

  return (
    <div style={{ padding: '20px 16px 100px', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="badge" style={{ fontSize: 'var(--fs-22)', color: C.dark }}>ACTIVITY LOG</div>
      </div>

      {/* Connections */}
      <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 8 }}>◆ CONNECTIONS</div>

      <ConnectCard
        label="Strava"
        connected={strava.connected}
        syncing={strava.syncing}
        syncCount={strava.syncCount}
        onConnect={strava.connect}
        onSync={handleStravaSync}
      />
      <ConnectCard
        label="Withings"
        connected={withings.connected}
        syncing={withings.syncing}
        syncCount={withings.syncCount}
        onConnect={withings.connect}
        onSync={handleWithingsSync}
      />

      {/* Latest body metrics */}
      {latestMetric && (
        <div style={{ marginBottom: 24 }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 8, marginTop: 8 }}>◆ BODY METRICS</div>
          <div style={{ background: '#fff', border: `0.5px solid ${C.ink20}`, borderRadius: 14, padding: '14px 16px' }}>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, marginBottom: 12 }}>
              {new Date(latestMetric.measured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 16px' }}>
              {latestMetric.weight_lbs !== null && (
                <div>
                  <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>WEIGHT</div>
                  <div className="badge" style={{ fontSize: 'var(--fs-20)', color: C.dark }}>{latestMetric.weight_lbs.toFixed(1)}</div>
                  <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40 }}>LBS</div>
                </div>
              )}
              {latestMetric.body_fat_pct !== null && (
                <div>
                  <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>BODY FAT</div>
                  <div className="badge" style={{ fontSize: 'var(--fs-20)', color: C.dark }}>{latestMetric.body_fat_pct.toFixed(1)}</div>
                  <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40 }}>%</div>
                </div>
              )}
              {latestMetric.muscle_mass_pct !== null && (
                <div>
                  <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>MUSCLE</div>
                  <div className="badge" style={{ fontSize: 'var(--fs-20)', color: C.dark }}>{latestMetric.muscle_mass_pct.toFixed(1)}</div>
                  <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40 }}>%</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <PushOptInCard />

      <BriefingVoiceCard />

      {/* Activity list */}
      <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 8 }}>◆ ACTIVITIES</div>

      {strava.activities.length === 0 && strava.connected === true && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.ink60, fontSize: 'var(--fs-15)' }}>
          No activities yet — tap Sync to load your history.
        </div>
      )}

      {strava.activities.map(a => (
        <div key={a.id} style={{
          background: 'white', borderRadius: 14, padding: '12px 14px',
          marginBottom: 10, border: `1px solid ${C.ink20}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 'var(--fs-16)' }}>{TYPE_ICON[a.activity_type] ?? '⚡'}</span>
                <span style={{ fontSize: 'var(--fs-15)', fontWeight: 600, color: C.dark }}>{a.title}</span>
              </div>
              <div className="mono" style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 'var(--fs-12)', color: C.ink60 }}>
                {a.distance_miles && <span>{a.distance_miles.toFixed(1)} mi</span>}
                {a.duration_seconds && <span>{formatDuration(a.duration_seconds)}</span>}
                {a.avg_pace_seconds_per_mile && a.activity_type === 'run' && (
                  <span>{formatPace(a.avg_pace_seconds_per_mile)}</span>
                )}
                {a.avg_hr && <span>{a.avg_hr} bpm</span>}
                {a.elevation_feet && <span>+{a.elevation_feet.toLocaleString()} ft</span>}
              </div>
            </div>
            <div className="mono" style={{ fontSize: 'var(--fs-12)', color: C.ink40, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {new Date(a.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
