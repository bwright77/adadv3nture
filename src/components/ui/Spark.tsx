import { C } from '../../tokens'

interface SparkProps {
  data: number[]
  color?: string
  h?: number
  w?: number
  fill?: boolean
  // 'zero' (default): bottom of chart = 0. Right when 0 is a meaningful
  // anchor (e.g. drinks, where 0 means no drinks).
  // 'min': bottom = min(data). Right when daily variance is the story and
  // values are far above 0 (e.g. steps, weight, RHR).
  baseline?: 'zero' | 'min'
}

export function Spark({ data, color = C.rust, h = 28, w = 100, fill = false, baseline = 'zero' }: SparkProps) {
  const max = Math.max(...data, 1)
  const min = baseline === 'min' ? Math.min(...data) : 0
  const range = Math.max(max - min, 1)  // avoid div-by-zero when all values equal
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {fill && <polygon points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.18" />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
