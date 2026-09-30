import { useId, useState } from 'react'
import { ChartNoAxesCombined } from 'lucide-react'
import { dateTime, money } from '../lib/portfolio'

export default function EquityChart({ points, loading }) {
  const gradient = useId().replace(/:/g, '')
  const [hover, setHover] = useState(null)
  if (!points.length) return <div className="chart-empty"><ChartNoAxesCombined size={38} strokeWidth={1} /><strong>{loading ? 'Loading portfolio history' : 'Your journey starts here'}</strong><span>{loading ? 'Fetching recorded valuations…' : 'The chart appears when the first valuation is recorded.'}</span></div>
  const values = points.map(point => point.value)
  const low = Math.min(...values), high = Math.max(...values)
  const padding = Math.max((high - low) * 0.24, Math.abs(high) * 0.002, 0.5)
  const min = low - padding, max = high + padding
  const first = points[0].time, last = points[points.length - 1].time
  const duration = Math.max(last - first, 1)
  const x = point => points.length === 1 ? 500 : 8 + (point.time - first) / duration * 984
  const y = point => 12 + (max - point.value) / (max - min) * 216
  const path = points.map((point, i) => `${i ? 'L' : 'M'}${x(point).toFixed(2)},${y(point).toFixed(2)}`).join(' ')
  const area = `${path} L${x(points[points.length - 1])},248 L${x(points[0])},248 Z`
  const index = hover === null ? null : Math.min(hover, points.length - 1)
  const selected = index === null ? null : points[index]
  function move(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const time = first + Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * duration
    let nearest = 0
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i].time - time) < Math.abs(points[nearest].time - time)) nearest = i
    setHover(nearest)
  }
  return <div className="chart-shell">
    <div className="chart-y-axis" aria-hidden="true">{[max, (max + min) / 2, min].map(value => <span key={value}>{money(value)}</span>)}</div>
    <div className="chart-plot" onPointerMove={move} onPointerLeave={() => setHover(null)}>
      <svg viewBox="0 0 1000 250" preserveAspectRatio="none" role="img" aria-label={`Portfolio value from ${money(points[0].value)} to ${money(points[points.length - 1].value)}`}>
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ed9857" stopOpacity="0.22" /><stop offset="100%" stopColor="#ed9857" stopOpacity="0" /></linearGradient></defs>
        {[12, 120, 228].map(row => <line key={row} x1="0" x2="1000" y1={row} y2={row} stroke="#ffffff" strokeOpacity=".075" strokeDasharray="3 7" />)}
        <path d={area} fill={`url(#${gradient})`} /><path d={path} fill="none" stroke="#ee9b5f" strokeWidth="2.3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <circle cx={x(points[points.length - 1])} cy={y(points[points.length - 1])} r="4" fill="#ffd4ae" />
        {selected && <><line x1={x(selected)} x2={x(selected)} y1="0" y2="248" stroke="#a7a7ac" strokeDasharray="3 4" /><circle cx={x(selected)} cy={y(selected)} r="5" fill="#ffc28d" stroke="#151719" strokeWidth="3" /></>}
      </svg>
      <input className="chart-scrubber" aria-label="Explore portfolio values" type="range" min="0" max={Math.max(0, points.length - 1)} value={index ?? points.length - 1} onChange={event => setHover(Number(event.target.value))} onFocus={() => setHover(points.length - 1)} onBlur={() => setHover(null)} aria-valuetext={selected ? `${money(selected.value)}, ${dateTime(selected.time)} UTC` : money(points[points.length - 1].value)} />
      {selected && <div className="chart-tooltip" style={{ left: `${Math.max(12, Math.min(78, x(selected) / 10))}%` }}><strong>{money(selected.value)}</strong><span>{dateTime(selected.time)} UTC {selected.live ? '· Live' : ''}</span></div>}
    </div><div className="chart-x-axis"><span>{dateTime(first)}</span><span>{dateTime(first + duration / 2)}</span><span>{dateTime(last)}</span></div>
  </div>
}
