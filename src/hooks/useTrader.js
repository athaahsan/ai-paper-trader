import { useEffect, useState } from 'react'
import { supabase, SESSION_TABLE, RUN_TABLE, configurationError } from '../lib/supabase'
import { costTotals } from '../lib/portfolio'

const sessionFields = 'id,started_at,symbol,timeframe,initial_cash_usdt,initial_btc,probability_threshold,min_trade_fraction,max_trade_fraction,minimum_trade_usdt,fee_rate'
const runFields = 'id,session_id,candle_close_at,recorded_at,model_id,indicators,buy_probability,sell_probability,selected_signal,action,market,mark_price,quote_observed_at,cash_before,btc_before,cash_after,btc_after,trade_fraction,skip_reason,error_code,fill_price,quantity_btc,notional_usdt,fee_rate,fee_asset,fee_amount,fee_equivalent_usdt,openrouter_cost_usd'
const costFields = 'candle_close_at,fee_equivalent_usdt,openrouter_cost_usd'
const initial = { session: null, latest: null, firstValuation: null, runs: [], costs: null, totalInRange: 0, syncedAt: null, loading: true, error: null }

function checked(result) {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

async function sessionCosts(sessionId, latest, signal) {
  if (!latest) return costTotals([])
  // Read the entire session, independently of the chart range and history cap.
  // Bound this snapshot to the latest run so a new insert cannot shift pages.
  const result = await supabase.from(RUN_TABLE).select(costFields, { count: 'exact' })
    .eq('session_id', sessionId).lte('candle_close_at', latest.candle_close_at)
    .order('candle_close_at', { ascending: false }).limit(500).abortSignal(signal)
  const rows = checked(result)
  const total = result.count ?? rows.length
  while (rows.length < total) {
    const page = checked(await supabase.from(RUN_TABLE).select(costFields)
      .eq('session_id', sessionId).lt('candle_close_at', rows[rows.length - 1].candle_close_at)
      .order('candle_close_at', { ascending: false }).limit(500).abortSignal(signal))
    if (!page.length) throw new Error('Session costs changed while loading. Refresh to retry.')
    rows.push(...page)
  }
  return costTotals(rows)
}

export function useTrader(hours) {
  const [data, setData] = useState(initial)
  const [connection, setConnection] = useState('connecting')
  const [refreshing, setRefreshing] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!supabase) return
    let alive = true, busy = false, scheduled = false
    const controller = new AbortController()
    async function refresh() {
      if (!alive) return
      if (busy) { scheduled = true; return }
      busy = true
      setRefreshing(true)
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])
        const sessions = checked(await supabase.from(SESSION_TABLE).select(sessionFields)
          .order('started_at', { ascending: false }).order('id', { ascending: false }).limit(1).abortSignal(signal))
        const session = sessions[0]
        if (!session) {
          if (alive) setData({ ...initial, loading: false, syncedAt: Date.now(), hours })
          return
        }
        const since = new Date(Date.now() - hours * 3600000).toISOString()
        const [latestResult, firstResult, rangeResult] = await Promise.all([
          supabase.from(RUN_TABLE).select(runFields).eq('session_id', session.id).order('candle_close_at', { ascending: false }).limit(1).abortSignal(signal),
          supabase.from(RUN_TABLE).select('mark_price,candle_close_at,quote_observed_at,recorded_at').eq('session_id', session.id).not('mark_price', 'is', null).order('candle_close_at', { ascending: true }).limit(1).abortSignal(signal),
          supabase.from(RUN_TABLE).select(runFields, { count: 'exact' }).eq('session_id', session.id).gte('recorded_at', since).order('candle_close_at', { ascending: false }).range(0, 499).abortSignal(signal),
        ])
        const latest = checked(latestResult)[0] || null
        const firstValuation = checked(firstResult)[0] || null
        const runs = checked(rangeResult)
        const totalInRange = rangeResult.count ?? runs.length
        const costs = await sessionCosts(session.id, latest, signal)
        while (runs.length < Math.min(totalInRange, 5000)) {
          const page = checked(await supabase.from(RUN_TABLE).select(runFields)
            .eq('session_id', session.id).gte('recorded_at', since)
            .lt('candle_close_at', runs[runs.length - 1].candle_close_at)
            .order('candle_close_at', { ascending: false }).limit(500).abortSignal(signal))
          if (!page.length) break
          runs.push(...page)
        }
        if (alive) setData({ session, latest, firstValuation, runs, costs, totalInRange, syncedAt: Date.now(), loading: false, error: null, hours })
      } catch (error) {
        if (alive) setData(previous => ({ ...previous, loading: false, error: error.message || 'Unable to load trading data.' }))
      } finally {
        busy = false
        if (alive) setRefreshing(false)
        if (scheduled && alive) { scheduled = false; void refresh() }
      }
    }
    function onVisible() { if (document.visibilityState === 'visible') void refresh() }
    void refresh()
    const interval = setInterval(onVisible, 30000)
    const channel = supabase.channel(`trader-dashboard-${hours}-${nonce}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: SESSION_TABLE }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: RUN_TABLE }, () => void refresh())
      .subscribe(status => {
        if (!alive) return
        setConnection(status === 'SUBSCRIBED' ? 'realtime' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED' ? 'polling' : 'connecting')
        if (status === 'SUBSCRIBED') void refresh()
      })
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      alive = false
      controller.abort()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [hours, nonce])

  return { ...data, loading: !configurationError && data.loading, connection, refreshing,
    configured: !configurationError, configurationError, refresh: () => setNonce(value => value + 1) }
}

export function useMarket(symbol = 'BTCUSDT') {
  const [market, setMarket] = useState({ quote: null, error: null })
  useEffect(() => {
    let alive = true, busy = false
    const controller = new AbortController()
    async function refresh() {
      if (busy || document.visibilityState === 'hidden') return
      busy = true
      try {
        const response = await fetch(`https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        })
        if (!response.ok) throw new Error('Market feed unavailable')
        const raw = await response.json()
        const price = Number(raw.lastPrice)
        if (!(price > 0) || raw.symbol !== symbol) throw new Error('Invalid market quote')
        if (alive) setMarket({ quote: { symbol, price, change: Number(raw.priceChangePercent), high: Number(raw.highPrice), low: Number(raw.lowPrice), receivedAt: Date.now() }, error: null })
      } catch (error) { if (alive) setMarket(previous => ({ ...previous, error: error.message })) }
      finally { busy = false }
    }
    void refresh()
    const interval = setInterval(refresh, 10000)
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => { alive = false; controller.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('online', onVisible) }
  }, [symbol])
  return market.quote?.symbol === symbol ? market : { quote: null, error: market.error }
}

export function useClock() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  return now
}
