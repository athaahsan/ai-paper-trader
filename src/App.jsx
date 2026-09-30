import { useState } from 'react'
import { Activity, ArrowRight, Bitcoin, ChartNoAxesCombined, ChevronRight, Clock3, Database, ExternalLink, Layers3, LayoutDashboard, Menu, Receipt, RefreshCw, Settings2, ShieldCheck, SlidersHorizontal, Wallet, Zap } from 'lucide-react'
import EquityChart from './components/EquityChart'
import { ActivityTable, Allocation, Decision, Stat } from './components/Panels'
import RunDetails from './components/RunDetails'
import { Indicators, Strategy } from './components/Views'
import { useClock, useMarket, useTrader } from './hooks/useTrader'
import { age, amount, apiCost, equityPoints, isRunStale, money, number, percent, portfolio } from './lib/portfolio'
import './App.css'

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'indicators', label: 'Model inputs', icon: SlidersHorizontal },
  { id: 'strategy', label: 'Strategy', icon: Settings2 },
]
const titles = {
  overview: ['Portfolio overview', 'Every decision. Every move. In the open.'],
  activity: ['Decision history', 'The complete record behind the portfolio.'],
  indicators: ['Inside the decision', 'The exact market data recorded for the model.'],
  strategy: ['The trading setup', 'A simple strategy, with transparent rules.'],
}

export default function App() {
  const [view, setView] = useState('overview')
  const [hours, setHours] = useState(24)
  const [menu, setMenu] = useState(false)
  const [selected, setSelected] = useState(null)
  const trader = useTrader(hours)
  const market = useMarket(trader.session?.symbol || 'BTCUSDT')
  const now = useClock()
  const { session, latest, runs, costs } = trader
  const recorded = [latest, ...runs].find(run => number(run?.mark_price) > 0)
  const quote = market.quote || (recorded ? { price: number(recorded.mark_price), receivedAt: Date.parse(recorded.quote_observed_at || recorded.candle_close_at) } : null)
  const fresh = market.quote && !market.error && now - market.quote.receivedAt < 30000
  const values = portfolio(session, latest, trader.firstValuation, quote)
  const points = equityPoints(runs)
  if (values.equity !== null && fresh && (!points.length || market.quote.receivedAt > points[points.length - 1].time) && (!latest || now - Date.parse(latest.candle_close_at) <= hours * 3600000)) points.push({ time: market.quote.receivedAt, value: values.equity, live: true })
  const trades = runs.filter(run => run.action === 'BUY' || run.action === 'SELL')
  const currentInputs = runs.find(run => Object.keys(run.indicators || {}).length) || (Object.keys(latest?.indicators || {}).length ? latest : null)
  const stale = isRunStale(latest, session, now)
  const pnlTone = values.pnl === null ? '' : values.pnl >= 0 ? 'positive' : 'negative'
  const go = next => { setView(next); setMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const syncing = trader.refreshing || (trader.configured && trader.hours !== hours && !trader.error)
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    {menu && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? 'is-open' : ''}`}><a className="brand" href="#" onClick={event => { event.preventDefault(); go('overview') }}><span className="brand-mark"><ChartNoAxesCombined size={22} strokeWidth={2.3} /></span><span>lab<span className="brand-period">.</span><small>TRADING LAB</small></span></a>
      <div className="workspace-label">WORKSPACE<span>01</span></div><nav aria-label="Main navigation">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => go(id)}><Icon size={18} /><span>{label}</span>{view === id && <span className="nav-active-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="experiment-label"><span className="small-circle" /> THE EXPERIMENT</div><p>AI makes the calls.<br />The numbers tell the story.</p><div className="public-label"><ShieldCheck size={15} /> Public · Read only</div><div className="sidebar-footer"><span className="avatar">AI</span><div>AI agent<small>Bitcoin spot trading</small></div><span className={`tiny-dot ${!latest || stale || trader.error ? 'muted-dot' : ''}`} title={!latest ? 'Awaiting first run' : stale ? 'Awaiting update' : 'Recent run recorded'} /></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button menu-toggle" aria-label="Open navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}><Menu size={20} /></button><span>Workspace</span><ChevronRight size={13} /><strong>{navigation.find(item => item.id === view).label}</strong></div><div className="topbar-right"><span className="paper-pill"><span /> Paper trading</span><span className="topbar-divider" /><a href="https://www.binance.com/en/trade/BTC_USDT?type=spot" target="_blank" rel="noreferrer" className="market-link">BTC / USDT <ExternalLink size={12} /></a></div></header>
      <main id="main-content"><div className="page-heading"><div><div className="eyebrow">AI / BITCOIN SPOT</div><h1>{titles[view][0]}</h1><p>{titles[view][1]}</p></div><button className="subtle-button refresh-button" onClick={trader.refresh} disabled={!trader.configured || trader.refreshing}><RefreshCw size={14} className={trader.refreshing ? 'spin' : ''} /> Refresh</button></div>
        {!trader.configured && <div className="notice setup-notice"><Database size={19} /><div><strong>{trader.configurationError === 'missing' ? 'Ready to connect' : 'Connection settings need attention'}</strong><p>{trader.configurationError === 'missing' ? 'The portfolio will appear when the data connection is configured.' : 'The dashboard needs a valid Supabase project URL and public key.'}</p></div><span>Awaiting data</span></div>}
        {trader.error && <div className="notice error-notice" role="alert"><Activity size={18} /><div><strong>Portfolio updates are unavailable</strong><p>{trader.syncedAt ? 'Showing the last successful snapshot. ' : ''}{trader.error}</p></div><button className="text-button" onClick={trader.refresh}>Retry <RefreshCw size={14} /></button></div>}
        {trader.configured && !trader.loading && !trader.error && !session && <div className="notice"><Clock3 size={18} /><p>No public trading session is available yet. The dashboard will update when one appears.</p></div>}
        <div className="market-strip"><div className="market-identity"><span className="bitcoin-icon"><Bitcoin size={20} /></span><div><strong>Bitcoin <span>BTC / USDT</span></strong><small>Binance spot</small></div></div><div className="market-price"><strong>{money(quote?.price)}</strong><span className={number(market.quote?.change) >= 0 ? 'positive' : 'negative'}>{market.quote ? percent(market.quote.change) : '—'} <small>24h</small></span></div><div className="market-range"><span>24h high<strong>{money(market.quote?.high)}</strong></span><span>24h low<strong>{money(market.quote?.low)}</strong></span></div><div className="feed-status"><span className={`tiny-dot ${fresh ? '' : 'muted-dot'}`} /><div>{fresh ? 'Live market' : quote ? 'Last known price' : 'Market unavailable'}<small>{quote ? `Updated ${age(quote.receivedAt, now).toLowerCase()}` : 'Waiting for a quote'}</small></div></div></div>
        {view === 'overview' && <><div className="stats-grid"><Stat label="Portfolio value" value={money(values.equity)} detail={quote ? `Valued at ${fresh ? 'live' : 'last known'} BTC price` : 'Awaiting valuation'} icon={Wallet} /><Stat label="Net profit / loss" value={values.pnl === null ? '—' : `${values.pnl > 0 ? '+' : ''}${money(values.pnl)}`} detail={<><span className={pnlTone}>{percent(values.returnPercent)}</span> <span>since {values.estimatedBaseline ? 'first valuation' : 'session start'}</span></>} icon={ChartNoAxesCombined} tone={pnlTone} /><Stat label="Available cash" value={money(values.cash)} detail="USDT · ready for the next signal" icon={Layers3} /><Stat label="Bitcoin holdings" value={amount(values.btc, 8)} suffix="BTC" detail={values.btcValue === null ? 'Awaiting valuation' : `${money(values.btcValue)} at current valuation`} icon={Bitcoin} /></div>
          <div className="costs-grid" aria-label="Session costs"><Stat label="Cumulative trading fees" value={money(costs?.tradingFees, 4)} suffix="USDT" detail="Since session start · BTC fees valued at fill price" icon={Receipt} /><Stat label="Recorded OpenRouter cost" value={apiCost(costs?.openrouterCost)} suffix="USD" detail={costs?.missingOpenrouterCosts ? `Since session start · ${costs.missingOpenrouterCosts} runs have no recorded cost` : 'Since session start · API expense'} icon={Zap} /></div>
          <div className="primary-grid"><section className="panel performance-panel"><div className="panel-heading"><div><h2>Portfolio performance</h2><p>Value over time, including recorded fees</p></div><div className="range-tabs" aria-label="Time range">{[[6, '6H'], [24, '24H'], [168, '7D']].map(([value, label]) => <button key={value} aria-pressed={hours === value} className={hours === value ? 'active' : ''} onClick={() => setHours(value)}>{label}</button>)}</div></div><div className="chart-summary"><span className="legend-line" /> Portfolio value <span className="chart-currency">USDT</span>{syncing && <span className="chart-updating">Updating…</span>}</div><EquityChart points={points} loading={trader.loading} /><div className="chart-footer"><span><span className="small-circle orange-dot" /> {points.length ? 'Recorded valuations + latest available value' : 'Waiting for recorded valuations'}</span><span>UTC</span></div></section><Decision run={latest} session={session} now={now} onDetails={setSelected} /></div>
          <div className="secondary-grid"><ActivityTable runs={runs} compact loading={trader.loading} hours={trader.hours || hours} onDetails={setSelected} onViewAll={() => go('activity')} /><Allocation values={values} /></div>
          <div className="overview-footnote"><ShieldCheck size={15} /><p>Every trade is simulated. Every decision is recorded.<span>{trades.length} trades across {runs.length} decisions in this view.</span></p><button className="text-button" onClick={() => go('strategy')}>Explore the strategy <ArrowRight size={14} /></button></div>
        </>}
        {view === 'activity' && <><div className="activity-summary"><div><span className="eyebrow">IN THIS PERIOD</span><strong>{runs.length} <span>decisions</span><i /> {trades.length} <span>trades</span></strong></div><label className="range-select">Time range<select value={hours} onChange={event => setHours(Number(event.target.value))}><option value={6}>Last 6 hours</option><option value={24}>Last 24 hours</option><option value={168}>Last 7 days</option></select></label></div><ActivityTable runs={runs} loading={trader.loading} hours={trader.hours || hours} onDetails={setSelected} /></>}
        {view === 'indicators' && <Indicators run={currentInputs} session={session} onDetails={setSelected} />}
        {view === 'strategy' && <Strategy session={session} run={latest} />}
        {trader.totalInRange > runs.length && <p className="coverage-note">Showing the latest {runs.length} of {trader.totalInRange} decisions in this period. Choose a shorter range to see every record.</p>}
        <footer className="page-footer"><span>lab<span className="brand-period">.</span> <span className="footer-label">An experiment in autonomous trading</span></span><span className="sync-status"><span className={`tiny-dot ${trader.configured && !trader.error && trader.syncedAt ? '' : 'muted-dot'}`} />{!trader.configured ? 'Not connected' : trader.error ? 'Updates interrupted' : trader.loading ? 'Connecting…' : `${trader.connection === 'realtime' ? 'Realtime connected' : 'Polling every 30s'} · synced ${age(trader.syncedAt, now).toLowerCase()}`}</span></footer>
      </main>
    </div>
    {selected && <RunDetails run={selected} onClose={() => setSelected(null)} />}
  </div>
}
