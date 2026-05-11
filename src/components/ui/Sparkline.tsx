interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  // If the metric is "good when low" (RHR, drinks, weight), the gradient fill
  // can flip so improvement reads as the same visual cue across rows.
}

// Compact line chart. Pure SVG — no dependencies, no axes.
// Renders nothing if there's fewer than 2 valid points.
export function Sparkline({
  values,
  width = 72,
  height = 22,
  color = 'currentColor',
  strokeWidth = 1.4,
}: SparklineProps) {
  const points = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const pad = 2

  const stepX = (width - pad * 2) / (points.length - 1)
  const scaleY = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2)

  const path = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * stepX).toFixed(2)} ${scaleY(v).toFixed(2)}`)
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
