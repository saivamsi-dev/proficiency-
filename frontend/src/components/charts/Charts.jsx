/**
 * Simple SVG-based chart components for analytics visualization.
 * No external dependencies - pure React + SVG.
 */
import { motion } from 'framer-motion'

const CHART_COLORS = [
  '#7c6af7', // purple
  '#2dd4bf', // teal
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#ec4899', // pink
  '#8b5cf6', // violet
]

/**
 * Animated Pie Chart Component
 */
export function PieChart({ data = [], size = 160, innerRadius = 0.6 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#52525b', fontSize: '0.875rem' }}>No data</span>
      </div>
    )
  }

  const radius = size / 2
  const innerR = radius * innerRadius

  const segments = data.map((item, index) => {
    const angle = (item.value / total) * 360
    const prevTotal = data.slice(0, index).reduce((sum, d) => sum + d.value, 0)
    const currentTotal = prevTotal + item.value

    const startAngle = -90 + (prevTotal / total) * 360
    const endAngle = -90 + (currentTotal / total) * 360

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = radius + radius * Math.cos(startRad)
    const y1 = radius + radius * Math.sin(startRad)
    const x2 = radius + radius * Math.cos(endRad)
    const y2 = radius + radius * Math.sin(endRad)

    const x1Inner = radius + innerR * Math.cos(startRad)
    const y1Inner = radius + innerR * Math.sin(startRad)
    const x2Inner = radius + innerR * Math.cos(endRad)
    const y2Inner = radius + innerR * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0
    const color = item.color || CHART_COLORS[index % CHART_COLORS.length]

    const path = innerRadius > 0
      ? `M ${x1Inner} ${y1Inner} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x2Inner} ${y2Inner} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}`
      : `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

    return { path, color, item, percentage: Math.round((item.value / total) * 100) }
  })

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        {segments.map((seg, i) => (
          <motion.path
            key={i}
            d={seg.path}
            fill={seg.color}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ cursor: 'pointer', transformOrigin: 'center' }}
            whileHover={{ scale: 1.03, filter: 'brightness(1.1)' }}
          >
            <title>{seg.item.name}: {seg.item.value} ({seg.percentage}%)</title>
          </motion.path>
        ))}
      </svg>
      {/* Center text */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}
        >
          {total}
        </motion.div>
        <div style={{ fontSize: '0.625rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Total
        </div>
      </div>
    </div>
  )
}

/**
 * Animated Line Chart Component
 */
export function LineChart({ data = [], width = 300, height = 120, showDots = true, showArea = true }) {
  if (data.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#52525b', fontSize: '0.875rem' }}>No data</span>
      </div>
    )
  }

  const padding = { top: 10, right: 10, bottom: 25, left: 35 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const values = data.map(d => d.accuracy || d.value || 0)
  const maxVal = Math.max(...values, 100)
  const minVal = Math.min(...values, 0)
  const range = maxVal - minVal || 1

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1 || 1)) * chartWidth,
    y: padding.top + chartHeight - ((values[i] - minVal) / range) * chartHeight,
    value: values[i],
    label: d.week || d.label || '',
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`

  return (
    <svg width={width} height={height}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padding.top + chartHeight - ((v - minVal) / range) * chartHeight
        return (
          <g key={v}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3,3"
            />
            <text
              x={padding.left - 8}
              y={y}
              textAnchor="end"
              alignmentBaseline="middle"
              fill="#52525b"
              fontSize="9"
            >
              {v}%
            </text>
          </g>
        )
      })}

      {/* Area */}
      {showArea && (
        <motion.path
          d={areaPath}
          fill="url(#lineGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
      )}

      {/* Line */}
      <motion.path
        d={linePath}
        fill="none"
        stroke="#7c6af7"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Dots */}
      {showDots && points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="#0a0a0a"
          stroke="#7c6af7"
          strokeWidth={2}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8 + i * 0.05 }}
          style={{ cursor: 'pointer' }}
          whileHover={{ scale: 1.5 }}
        >
          <title>{p.label}: {p.value}%</title>
        </motion.circle>
      ))}

      {/* X-axis labels */}
      {points.map((p, i) => (
        i % Math.ceil(points.length / 4) === 0 || i === points.length - 1 ? (
          <text
            key={i}
            x={p.x}
            y={height - 5}
            textAnchor="middle"
            fill="#52525b"
            fontSize="9"
          >
            {p.label}
          </text>
        ) : null
      ))}

      {/* Gradient */}
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7c6af7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7c6af7" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/**
 * Animated Bar Chart Component
 */
export function BarChart({ data = [], width = 280, height = 120, horizontal = false }) {
  if (data.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#52525b', fontSize: '0.875rem' }}>No data</span>
      </div>
    )
  }

  const padding = horizontal
    ? { top: 5, right: 40, bottom: 5, left: 70 }
    : { top: 10, right: 10, bottom: 30, left: 35 }
  
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const values = data.map(d => d.value || 0)
  const maxVal = Math.max(...values, 1)

  if (horizontal) {
    const barHeight = Math.min((chartHeight / data.length) - 6, 20)
    
    return (
      <svg width={width} height={height}>
        {data.map((d, i) => {
          const barWidth = (d.value / maxVal) * chartWidth
          const y = padding.top + (i * (chartHeight / data.length)) + (chartHeight / data.length - barHeight) / 2
          const color = d.color || CHART_COLORS[i % CHART_COLORS.length]

          return (
            <g key={i}>
              <text
                x={padding.left - 8}
                y={y + barHeight / 2}
                textAnchor="end"
                alignmentBaseline="middle"
                fill="#a1a1aa"
                fontSize="10"
              >
                {d.name}
              </text>
              <motion.rect
                x={padding.left}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={color}
                initial={{ width: 0 }}
                animate={{ width: barWidth }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ cursor: 'pointer' }}
                whileHover={{ filter: 'brightness(1.2)' }}
              >
                <title>{d.name}: {d.value}</title>
              </motion.rect>
              <motion.text
                x={padding.left + barWidth + 6}
                y={y + barHeight / 2}
                alignmentBaseline="middle"
                fill={color}
                fontSize="10"
                fontWeight="600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 + 0.3 }}
              >
                {d.value}
              </motion.text>
            </g>
          )
        })}
      </svg>
    )
  }

  // Vertical bars
  const barWidth = Math.min((chartWidth / data.length) - 8, 30)

  return (
    <svg width={width} height={height}>
      {/* Y-axis grid */}
      {[0, 0.5, 1].map((ratio, i) => {
        const y = padding.top + chartHeight * (1 - ratio)
        return (
          <g key={i}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
            />
            <text
              x={padding.left - 8}
              y={y}
              textAnchor="end"
              alignmentBaseline="middle"
              fill="#52525b"
              fontSize="9"
            >
              {Math.round(maxVal * ratio)}
            </text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const barHeight = (d.value / maxVal) * chartHeight
        const x = padding.left + (i * (chartWidth / data.length)) + (chartWidth / data.length - barWidth) / 2
        const y = padding.top + chartHeight - barHeight
        const color = d.color || CHART_COLORS[i % CHART_COLORS.length]

        return (
          <g key={i}>
            <motion.rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={color}
              initial={{ height: 0, y: padding.top + chartHeight }}
              animate={{ height: barHeight, y }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ cursor: 'pointer' }}
              whileHover={{ filter: 'brightness(1.2)' }}
            >
              <title>{d.name}: {d.value}</title>
            </motion.rect>
            <text
              x={x + barWidth / 2}
              y={height - 8}
              textAnchor="middle"
              fill="#a1a1aa"
              fontSize="9"
            >
              {d.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Progress Ring Component
 */
export function ProgressRing({ value = 0, max = 100, size = 80, strokeWidth = 8, color = '#7c6af7', label = '' }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / max, 1)
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      {/* Center content */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          style={{ fontSize: size * 0.2, fontWeight: 700, color: '#fff' }}
        >
          {Math.round(value)}
        </motion.div>
        {label && (
          <div style={{ fontSize: size * 0.1, color: '#6b6b6b', marginTop: 2 }}>
            {label}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Mini Sparkline Component
 */
export function Sparkline({ data = [], width = 100, height = 30, color = '#7c6af7' }) {
  if (data.length < 2) return null

  const values = data.map(d => typeof d === 'number' ? d : d.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }))

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg width={width} height={height}>
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.6 }}
      />
    </svg>
  )
}
