import React from 'react'

export const PIE_COLORS = ['#60a5fa','#34d399','#fca5a5','#fbbf24','#c084fc']

export default function PieChart({ data = [], size = 160, colors = PIE_COLORS }) {
  const total = data.reduce((a,b)=>a+b.value,0) || 1
  const cx = size/2, cy=size/2, r=size/2
  let angle = -Math.PI/2
  const segs = data.map((d,i)=>{
    const slice = (d.value/total) * Math.PI*2
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    angle += slice
    const x2 = cx + r * Math.cos(angle)
    const y2 = cy + r * Math.sin(angle)
    const large = slice > Math.PI ? 1 : 0
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    return <path key={i} d={path} stroke="var(--border)" fill={colors[i % colors.length]} />
  })
  return (<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{segs}</svg>)
}
