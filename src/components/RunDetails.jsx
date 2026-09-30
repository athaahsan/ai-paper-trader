import { useEffect, useRef } from 'react'
import { Code2, X } from 'lucide-react'
import { amount, apiCost, candleStatus, dateTime, modelInputs, money, number, reasonLabels, runTime } from '../lib/portfolio'
import { Badge } from './Panels'

export default function RunDetails({ run, onClose }) {
  const ref = useRef(null)
  useEffect(() => { if (!ref.current.open) ref.current.showModal() }, [])
  return <dialog ref={ref} className="run-dialog" aria-label="Decision details" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) ref.current.close() }}><div className="dialog-content"><div className="dialog-heading"><div><span className="eyebrow">DECISION RECORD</span><h2>{dateTime(runTime(run))} <span>UTC</span></h2></div><button className="icon-button" aria-label="Close decision details" onClick={() => ref.current.close()}><X size={20} /></button></div>
    <div className="detail-status"><Badge action={run.action} /><span>{run.model_id || 'Model unavailable'}</span></div>
    {(run.skip_reason || run.error_code) && <div className="notice">{reasonLabels[run.skip_reason || run.error_code] || run.skip_reason || run.error_code}</div>}
    <dl className="detail-grid">{[
      ['Inputs captured', run.indicators?.snapshot_at ? `${dateTime(run.indicators.snapshot_at)} UTC` : 'Not recorded'],
      ['Candle starts', run.indicators?.candle_open_at ? `${dateTime(run.indicators.candle_open_at)} UTC` : 'Not recorded'],
      ['Scheduled candle end', `${dateTime(run.candle_close_at)} UTC`], ['Candle status at snapshot', candleStatus(run)],
      ['Record saved', run.recorded_at ? `${dateTime(run.recorded_at)} UTC` : 'Not recorded'],
      ['Buy probability', number(run.buy_probability) === null ? '—' : `${amount(number(run.buy_probability) * 100, 2)}%`], ['Sell probability', number(run.sell_probability) === null ? '—' : `${amount(number(run.sell_probability) * 100, 2)}%`],
      ['BTC quantity', amount(run.quantity_btc)], ['Fill price', money(run.fill_price)], ['Trade value', money(run.notional_usdt)], ['Recorded fee', run.fee_asset ? `${amount(run.fee_amount, run.fee_asset === 'BTC' ? 8 : 4)} ${run.fee_asset}` : '—'],
      ['Fee equivalent · USDT', money(run.fee_equivalent_usdt, 4)], ['OpenRouter cost · USD', apiCost(run.openrouter_cost_usd)],
      ['Cash before', money(run.cash_before)], ['Cash after', money(run.cash_after)], ['BTC before', amount(run.btc_before)], ['BTC after', amount(run.btc_after)], ['Quote observed', run.quote_observed_at ? `${dateTime(run.quote_observed_at)} UTC` : '—'], ['Mark price', money(run.mark_price)],
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <details className="raw-payload"><summary><Code2 size={15} /> Exact model inputs</summary><pre>{JSON.stringify(modelInputs(run), null, 2)}</pre></details>
    <p className="dialog-footnote">{run.indicators?.last_candle_is_closed === false ? 'The latest indicator readings include the forming candle as it was at capture time.' : 'Model inputs use completed candles.'} The saved inputs stay fixed; the fill quote is fetched after the model responds.</p>
  </div></dialog>
}
