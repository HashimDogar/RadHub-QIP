import React from 'react'
import { PIE_COLORS } from './PieChart'

export default function LineGraph({
  series = [],
  labels = [],
  width = 240,
  height = 120,
  colors = PIE_COLORS
}) {
  const count = series[0]?.length || 0
  if (count === 0) return null

  // leave room on the left for axis labels
  const marginLeft = 20
  const graphWidth = width - marginLeft
  const xStep = count > 1 ? graphWidth / (count - 1) : graphWidth
  const yScale = v => height - (Math.max(0, Math.min(v, 10)) / 10) * height

  const paths = series.map((values, i) => {
    const d = values
      .map((v, idx) => `${idx === 0 ? 'M' : 'L'} ${idx * xStep + marginLeft} ${yScale(v)}`)
      .join(' ')
    return (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={colors[i % colors.length]}
        strokeWidth="2"
      />
    )
  })

  const ticks = [0, 5, 10]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        {/* axes */}
        <line x1={marginLeft} y1={0} x2={marginLeft} y2={height} stroke="#ccc" />
        <line x1={marginLeft} y1={height} x2={width} y2={height} stroke="#ccc" />

        {/* ticks and grid lines */}
        {ticks.map(t => (
          <g key={t}>
            <line
              x1={marginLeft - 4}
              y1={yScale(t)}
              x2={marginLeft}
              y2={yScale(t)}
              stroke="#ccc"
            />
            <text
              x={marginLeft - 6}
              y={yScale(t) + 4}
              fontSize={10}
              textAnchor="end"
            >
              {t}
            </text>
            <line
              x1={marginLeft}
              y1={yScale(t)}
              x2={width}
              y2={yScale(t)}
              stroke="#eee"
            />
          </g>
        ))}

        {paths}
      </svg>
      {labels.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            fontSize: 12,
            marginTop: 4
          }}
        >
          {labels.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: colors[i % colors.length],
                  display: 'inline-block'
                }}
              ></span>
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
