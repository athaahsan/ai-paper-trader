export function number(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function money(value, decimals = 2) {
  const parsed = number(value)
  return parsed === null ? '—' : new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(parsed)
}

export function apiCost(value) {
  const parsed = number(value)
  if (parsed === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 12,
  }).format(parsed)
}

export function costTotals(runs) {
  let tradingFees = 0, openrouterCost = 0, reportedCosts = 0
  for (const run of runs) {
    tradingFees += number(run.fee_equivalent_usdt) ?? 0
    const cost = number(run.openrouter_cost_usd)
    if (cost !== null) { openrouterCost += cost; reportedCosts++ }
  }
  return {
    tradingFees,
    openrouterCost: runs.length && !reportedCosts ? null : openrouterCost,
    missingOpenrouterCosts: runs.length - reportedCosts,
  }
}

export function amount(value, decimals = 8) {
  const parsed = number(value)
  return parsed === null ? '—' : new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals, minimumFractionDigits: decimals,
  }).format(parsed)
}

export function percent(value, decimals = 2) {
  const parsed = number(value)
  return parsed === null ? '—' : `${parsed > 0 ? '+' : ''}${parsed.toFixed(decimals)}%`
}

export function dateTime(value, short = false) {
  if (value === null || value === undefined || !Number.isFinite(new Date(value).getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', ...(short ? {} : { day: '2-digit', month: 'short' }),
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value))
}

export function age(value, now) {
  if (!value) return 'Not yet'
  const seconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000))
  if (seconds < 10) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function isRunStale(run, session, now) {
  if (!run) return false
  const timeframe = session?.timeframe || run.indicators?.timeframe
  const match = /^([1-9]\d*)([mhd])$/.exec(timeframe || '')
  const closedAt = Date.parse(run.candle_close_at)
  if (!match || !Number.isFinite(closedAt)) return true
  const unit = { m: 60000, h: 3600000, d: 86400000 }[match[2]]
  return now - closedAt > Number(match[1]) * unit * 2
}

export const reasonLabels = {
  no_cash: 'No cash available', no_btc: 'No BTC available',
  below_minimum_quantity: 'Below the minimum BTC quantity',
  below_minimum_trade: 'Below the minimum trade value',
  below_exchange_minimum_notional: 'Below the exchange minimum trade value',
  above_exchange_maximum_quantity: 'Above the exchange quantity limit',
  above_exchange_maximum_notional: 'Above the exchange trade value limit',
  indicator_failed: 'Indicator calculation failed', model_failed: 'Model request failed',
  invalid_model_response: 'Invalid model response', market_data_failed: 'Market quote unavailable',
}

export function portfolio(session, latest, firstValuation, quote) {
  if (!session) return { cash: null, btc: null, price: null, equity: null, pnl: null, returnPercent: null, btcValue: null, allocation: null }
  const cash = number(latest ? latest.cash_after : session.initial_cash_usdt)
  const btc = number(latest ? latest.btc_after : session.initial_btc)
  const price = number(quote?.price)
  const btcValue = btc === 0 ? 0 : btc !== null && price !== null ? btc * price : null
  const equity = cash !== null && btcValue !== null ? cash + btcValue : null
  const initialBtc = number(session.initial_btc)
  const initialCash = number(session.initial_cash_usdt)
  const startPrice = number(firstValuation?.mark_price)
  const baseline = initialCash !== null && initialBtc !== null
    ? initialBtc === 0 ? initialCash : startPrice !== null ? initialCash + initialBtc * startPrice : null
    : null
  const pnl = equity !== null && baseline !== null ? equity - baseline : null
  return { cash, btc, price, btcValue, equity, pnl,
    returnPercent: pnl !== null && baseline > 0 ? pnl / baseline * 100 : null,
    allocation: equity > 0 ? btcValue / equity * 100 : equity === 0 ? 0 : null,
    baseline, estimatedBaseline: initialBtc > 0,
  }
}

export function equityPoints(runs) {
  return [...runs].reverse().flatMap(run => {
    const cash = number(run.cash_after), btc = number(run.btc_after), price = number(run.mark_price)
    const time = Date.parse(run.quote_observed_at || run.candle_close_at)
    if (cash === null || btc === null || (btc !== 0 && price === null) || !Number.isFinite(time)) return []
    return [{ time, value: cash + btc * (price ?? 0), action: run.action }]
  }).sort((a, b) => a.time - b.time)
}
