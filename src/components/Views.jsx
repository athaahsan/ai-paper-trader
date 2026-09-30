import { CircleHelp, Code2, Database, ShieldCheck, SlidersHorizontal, Zap } from 'lucide-react'
import { amount, candleStatus, dateTime, inputTime, modelInputs, money, number } from '../lib/portfolio'
import { Empty } from './Panels'

const indicatorLabels = {
  price_last_14: ['Recent candle prices', 'Last 14 completed candles'],
  ema_20: ['EMA · 20', '20-period exponential moving average'], ema_50: ['EMA · 50', '50-period exponential moving average'], ema_100: ['EMA · 100', '100-period exponential moving average'],
  price_vs_ema20_percent: ['Price vs. EMA 20', 'Distance from the 20-period EMA (%)'], price_vs_ema50_percent: ['Price vs. EMA 50', 'Distance from the 50-period EMA (%)'], price_vs_ema100_percent: ['Price vs. EMA 100', 'Distance from the 100-period EMA (%)'],
  rsi_14_last_7: ['RSI · 14', 'Last 7 readings, oldest to newest'], macd_histogram_12_26_9_last_7: ['MACD histogram · 12 / 26 / 9', 'Last 7 readings, oldest to newest'],
  bollinger_middle_20_2: ['Bollinger middle', '20-period SMA'], bollinger_upper_20_2: ['Bollinger upper', 'SMA + 2 standard deviations'], bollinger_lower_20_2: ['Bollinger lower', 'SMA − 2 standard deviations'],
  bollinger_percent_b_20_2: ['Bollinger %B', 'Position between the lower (0) and upper (1) bands'], bollinger_bandwidth_percent_20_2: ['Bollinger bandwidth', 'Band width as a percentage of the middle band'],
  adx_14: ['ADX · 14', 'Trend strength'], positive_di_14: ['+DI · 14', 'Positive directional index'], negative_di_14: ['−DI · 14', 'Negative directional index'], di_delta_14: ['Directional difference', '+DI minus −DI'],
}

export function Indicators({ run, session, onDetails }) {
  const indicators = modelInputs(run)
  const timeframe = indicators.timeframe || session?.timeframe
  const forming = run?.indicators?.last_candle_is_closed === false
  return <><div className="section-intro"><span><Database size={15} />{run ? `${run.indicators?.snapshot_at ? 'Snapshot captured' : 'Candle closed'} ${dateTime(inputTime(run))} UTC` : 'Waiting for market inputs'}</span><span>{timeframe ? `${timeframe} candles` : 'Timeframe unavailable'} · {indicators.instrument || session?.symbol || '—'}</span>{run && <span>{candleStatus(run)}</span>}</div>
    {!Object.keys(indicators).length ? <section className="panel"><Empty title="No model inputs yet" icon={SlidersHorizontal}>The exact indicator values sent to the model will appear after a recorded run.</Empty></section> : <div className="indicators-grid">{Object.entries(indicatorLabels).map(([key, [label, description]]) => {
      const value = indicators[key], series = Array.isArray(value)
      return <section className={`panel indicator-card ${series ? 'series-card' : ''}`} key={key}><span className="eyebrow">{label}</span><strong>{amount(series ? value[value.length - 1] : value, 4)}</strong><p>{key === 'price_last_14' && forming ? 'Last 14 candles · final candle forming at capture' : description}</p>{series && <div className="series-values">{value.map((item, index) => <span key={index}>{amount(item, 4)}</span>)}</div>}</section>
    })}</div>}
    {run && <button className="subtle-button raw-button" onClick={() => onDetails(run)}><Code2 size={15} /> View recorded payload</button>}
  </>
}

export function Strategy({ session, run }) {
  const threshold = number(session?.probability_threshold)
  const min = number(session?.min_trade_fraction), max = number(session?.max_trade_fraction)
  return <div className="strategy-grid"><section className="panel strategy-flow"><div className="panel-heading"><h2>How a decision becomes a trade</h2><Zap size={17} /></div>{[
    ['01', 'Read the market', `Google Apps Script calculates indicators from ${session?.timeframe ? `${session.timeframe} ` : ''}Binance spot candles, including the current forming candle at capture time.`],
    ['02', 'Ask the model', 'The model receives the indicators and returns two probabilities: buy and sell.'],
    ['03', 'Check confidence', threshold === null ? 'The session defines the minimum confidence required to trade.' : `A signal must reach ${(threshold * 100).toFixed(0)}% confidence. Otherwise, the portfolio holds.`],
    ['04', 'Size and record', min === null || max === null ? 'Qualifying trades use the sizing rules saved with the session.' : `A qualifying signal uses ${(min * 100).toFixed(0)}–${(max * 100).toFixed(0)}% of available cash for a buy, or BTC holdings for a sell. Higher confidence means a larger trade.`],
  ].map(([step, title, description]) => <div className="strategy-step" key={step}><span>{step}</span><div><h3>{title}</h3><p>{description}</p></div></div>)}</section>
  <section className="panel settings-card"><div className="panel-heading"><h2>Current session</h2><ShieldCheck size={16} /></div><dl>{[
    ['Instrument', session?.symbol || '—'], ['Timeframe', session?.timeframe || '—'], ['Trade range', min === null || max === null ? '—' : `${amount(min * 100, 0)}–${amount(max * 100, 0)}%`], ['Initial cash', money(session?.initial_cash_usdt)], ['Initial BTC', amount(session?.initial_btc)], ['Minimum trade', money(session?.minimum_trade_usdt)], ['Fee rate', session ? `${amount(number(session.fee_rate) * 100, 2)}%` : '—'], ['Model used', run?.model_id || 'No recorded model'], ['Session started', session ? `${dateTime(session.started_at)} UTC` : '—'],
  ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="panel-footnote">Minimum quantity and trade-value rules from Binance also apply. These settings are read from the active session.</p></section>
  <div className="strategy-note"><CircleHelp size={18} /><p>This is a public paper-trading portfolio. Trades are simulated and no real orders are placed. Performance includes recorded fees. Dollar values on this dashboard represent USDT.</p></div></div>
}
