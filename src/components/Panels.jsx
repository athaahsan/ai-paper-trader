import { useState } from 'react'
import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Bitcoin, ChevronLeft, ChevronRight, Clock3, Download, Layers3, Zap } from 'lucide-react'
import { age, amount, dateTime, isRunStale, money, number, reasonLabels, runTime } from '../lib/portfolio'

export function Badge({ action }) { return <span className={`badge ${String(action || 'waiting').toLowerCase()}`}>{action || 'WAITING'}</span> }
export function Empty({ title, children, icon: Icon = Activity }) { return <div className="empty"><Icon size={30} strokeWidth={1.2} /><h3>{title}</h3><p>{children}</p></div> }
export function Stat({ label, value, detail, icon: Icon, tone = '', suffix }) {
  return <div className="stat"><div className="stat-label">{label}<Icon size={16} /></div><div className={`stat-value ${tone}`}>{value}{suffix && <span>{suffix}</span>}</div><div className="stat-detail">{detail}</div></div>
}

export function Decision({ run, session, now, onDetails }) {
  const buy = number(run?.buy_probability), sell = number(run?.sell_probability)
  const threshold = number(session?.probability_threshold)
  const winning = buy !== null && sell !== null ? Math.max(buy, sell) : null
  const old = isRunStale(run, session, now)
  const text = !run ? 'Waiting for the first decision.' : run.action === 'ERROR' ? reasonLabels[run.error_code] || 'This run could not complete.' : run.action === 'SKIP' ? reasonLabels[run.skip_reason] || 'Trade skipped by execution rules.' : run.action === 'HOLD' ? 'Neither signal reached the confidence threshold.' : `${amount(number(run.trade_fraction) * 100, 1)}% of ${run.action === 'BUY' ? 'available cash' : 'BTC holdings'} allocated.`
  return <section className="panel decision-panel">
    <div className="panel-heading"><h2><Zap size={17} /> Latest decision</h2><span className={`tiny-dot ${old || !run ? 'muted-dot' : ''}`} /></div>
    <div className="decision-main"><div><span className="eyebrow">MODEL SIGNAL</span><div className={`decision-word ${String(run?.selected_signal || '').toLowerCase()}`}>{run?.selected_signal || 'Awaiting data'}{run?.selected_signal === 'BUY' ? <ArrowUpRight size={30} /> : run?.selected_signal === 'SELL' ? <ArrowDownLeft size={30} /> : null}</div></div><div className="decision-confidence">{winning === null ? '—' : `${(winning * 100).toFixed(1)}%`}<span>confidence</span></div></div>
    <div className="confidence-bars">{[['Buy', buy], ['Sell', sell]].map(([label, value]) => <div className="confidence-row" key={label}><div><span>{label}</span><strong>{value === null ? '—' : `${(value * 100).toFixed(1)}%`}</strong></div><div className="confidence-track"><span className={label.toLowerCase()} style={{ width: `${(value ?? 0) * 100}%` }} />{threshold !== null && <i style={{ left: `${threshold * 100}%` }} title={`${threshold * 100}% threshold`} />}</div></div>)}</div>
    <div className="threshold-note"><span className="threshold-mark" />{threshold === null ? 'Confidence threshold set by session' : `${amount(threshold * 100, 0)}% required to trade`}</div>
    <div className="decision-result"><div><span className="muted">Outcome</span><Badge action={run?.action} /></div><p>{text}</p></div>
    <button className="decision-footer" onClick={() => run && onDetails(run)} disabled={!run}><span><Clock3 size={13} />{age(runTime(run), now)}{old ? ' · Awaiting update' : ''}</span><ArrowRight size={15} /></button>
  </section>
}

export function Allocation({ values }) {
  const allocation = values.allocation
  return <section className="panel allocation-panel"><div className="panel-heading"><h2>Asset allocation</h2><Layers3 size={16} className="muted" /></div>
    <div className="allocation-body"><div className={`donut ${allocation === null ? 'empty-donut' : ''}`} style={{ '--allocation': `${allocation ?? 0}%` }} role="img" aria-label={allocation === null ? 'Allocation unavailable' : `${allocation.toFixed(1)}% Bitcoin, ${(100 - allocation).toFixed(1)}% cash`}><div><Bitcoin size={22} /><strong>{allocation === null ? '—' : `${allocation.toFixed(1)}%`}</strong><span>in Bitcoin</span></div></div>
    <div className="allocation-legend"><div><i className="orange-dot" /><span>Bitcoin<strong>{money(values.btcValue)}</strong></span><small>BTC</small></div><div><i className="cash-dot" /><span>Available cash<strong>{money(values.cash)}</strong></span><small>USDT</small></div></div></div>
    <p className="panel-footnote">Allocation moves with trades and the BTC price.</p>
  </section>
}

function exportRuns(runs) {
  const fields = ['decision_at', 'recorded_at', 'quote_observed_at', 'snapshot_at', 'candle_open_at', 'candle_close_at', 'last_candle_is_closed', 'action', 'selected_signal', 'buy_probability', 'sell_probability', 'fill_price', 'quantity_btc', 'notional_usdt', 'fee_asset', 'fee_amount', 'fee_equivalent_usdt', 'openrouter_cost_usd', 'cash_after', 'btc_after', 'model_id', 'skip_reason', 'error_code']
  const escape = value => { const text = String(value ?? ''); return `"${(/^[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"` }
  const text = [fields.join(','), ...runs.map(run => {
    const record = { ...run, decision_at: runTime(run), snapshot_at: run.indicators?.snapshot_at,
      candle_open_at: run.indicators?.candle_open_at, last_candle_is_closed: run.indicators?.last_candle_is_closed }
    return fields.map(field => escape(record[field])).join(',')
  })].join('\r\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a'); link.href = url; link.download = 'trading-decisions.csv'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ActivityTable({ runs, compact, loading, hours, onDetails, onViewAll }) {
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(0)
  const filtered = filter === 'ALL' ? runs : runs.filter(run => run.action === filter)
  const size = compact ? 5 : 12
  const pageCount = Math.max(1, Math.ceil(filtered.length / size))
  const current = Math.min(page, pageCount - 1)
  const shown = compact ? filtered.slice(0, size) : filtered.slice(current * size, (current + 1) * size)
  return <section className="panel activity-panel"><div className="panel-heading"><div className="heading-with-count"><h2>{compact ? 'Recent activity' : 'All decisions'}</h2><span className="count-label">{runs.length}</span></div>{compact ? <button className="text-button" onClick={onViewAll}>View all <ArrowRight size={14} /></button> : <button className="subtle-button" disabled={!filtered.length} onClick={() => exportRuns(filtered)}><Download size={14} /> Export CSV</button>}</div>
    {!compact && <div className="table-toolbar"><div className="filter-tabs" aria-label="Filter decisions">{['ALL', 'BUY', 'SELL', 'HOLD', 'SKIP', 'ERROR'].map(action => <button aria-pressed={filter === action} className={filter === action ? 'active' : ''} key={action} onClick={() => { setFilter(action); setPage(0) }}>{action === 'ALL' ? 'All activity' : action[0] + action.slice(1).toLowerCase()}</button>)}</div><span className="muted">Last {hours === 168 ? '7 days' : `${hours} hours`}</span></div>}
    {!shown.length ? <Empty title={loading ? 'Loading decisions…' : filter === 'ALL' ? 'No decisions in this period' : `No ${filter.toLowerCase()} decisions`}>{loading ? 'Reading the trading journal.' : 'Recorded decisions will appear here, including holds and skipped trades.'}</Empty> : <div className="table-scroll"><table><thead><tr><th>Decision time <span>UTC</span></th><th>Action</th><th>Confidence</th><th>BTC quantity</th><th>Fill price</th><th>Value <span>USDT</span></th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{shown.map(run => {
      const buy = number(run.buy_probability), sell = number(run.sell_probability)
      const confidence = buy !== null && sell !== null ? Math.max(buy, sell) * 100 : null
      return <tr key={run.id || run.candle_close_at}><td className="time-cell">{dateTime(runTime(run))}</td><td><Badge action={run.action} /></td><td>{confidence === null ? '—' : `${confidence.toFixed(1)}%`}</td><td>{amount(run.quantity_btc)}</td><td>{money(run.fill_price)}</td><td>{money(run.notional_usdt)}</td><td><button className="icon-button row-open" aria-label={`View ${run.action} decision at ${dateTime(runTime(run))} UTC`} onClick={() => onDetails(run)}><ArrowUpRight size={17} /></button></td></tr>
    })}</tbody></table></div>}
    <div className="table-footer"><span>{compact ? `Latest decisions · ${hours === 168 ? '7-day' : `${hours}-hour`} view` : `${filtered.length ? current * size + 1 : 0}–${Math.min((current + 1) * size, filtered.length)} of ${filtered.length} decisions`}</span>{compact ? <span><span className="small-circle" /> Recorded by Google Apps Script</span> : <div className="pagination"><button className="icon-button" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button><span>{current + 1} / {pageCount}</span><button className="icon-button" disabled={current + 1 >= pageCount} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight size={16} /></button></div>}</div>
  </section>
}
