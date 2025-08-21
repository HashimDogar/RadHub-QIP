import React from 'react'

/**
 * Simple SVG pie chart (no external deps)
 * Props: data = [{ label, value }]
 */
export default function PieChart({ data = [], size = 220 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const radius = size / 2;
  const cx = radius, cy = radius;

  function getCoord(angle) {
    const rad = (angle - 90) * Math.PI / 180.0;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  }

  const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];

  return (
    <svg className="pie" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Outcome breakdown">
      {data.map((d, i) => {
        const slice = (d.value / total) * 360;
        const [x1, y1] = getCoord(cumulative);
        const [x2, y2] = getCoord(cumulative + slice);
        const largeArc = slice > 180 ? 1 : 0;
        const pathData = [
          `M ${cx} ${cy}`,
          `L ${x1} ${y1}`,
          `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
          'Z'
        ].join(' ');
        cumulative += slice;
        return <path key={i} d={pathData} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="1" />
      })}
    </svg>
  )
}
