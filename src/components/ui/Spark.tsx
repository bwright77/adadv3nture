import { C } from '../../tokens'

interface SparkProps {
  data: number[]
  color?: string
  h?: number
  w?: number
  fill?: boolean
}

export function Spark({ data, color = C.rust, h = 28, w = 100, fill = false }: SparkProps) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`)
    .join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {fill && <polygon points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.18" />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
