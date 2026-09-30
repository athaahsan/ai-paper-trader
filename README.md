# Trading Lab

A public, read-only Bitcoin paper-trading dashboard built with React. Google Apps Script makes decisions and writes trades; this frontend only reads data.

## Connect

Fill in the prepared `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Use a publishable key (`sb_publishable_...`) or the legacy **anon** key. Secret and service-role keys must never be used in this frontend. The build exposes only the two public settings above. `.env` is ignored by Git.

```sh
npm install
npm run dev
```

Restart the development server after changing environment values. Without configuration, the dashboard shows an empty connection state. It never substitutes sample trades.

## Netlify

Add the same two environment variables in Netlify, then deploy. `netlify.toml` sets the build command to `npm run build` and the publish directory to `dist`. Environment changes require a new build. No Netlify functions are required.

## Supabase contract

The existing `public.ai_paper_trader_sessions` and `public.ai_paper_trader_runs` tables are used directly. Column names match the standalone GAS. The latest session is selected by `started_at`, then `id`, descending.

The public/anon role needs SELECT access through your existing grants and RLS policies. It should have no INSERT, UPDATE, or DELETE access. Enable both tables in the `supabase_realtime` publication for instant updates. No RPCs, database functions, or schema changes are needed by this frontend.

Realtime events trigger a fresh read. A 30-second poll and refresh on visibility/online changes recover missed updates. Binance's public BTCUSDT 24-hour ticker is fetched every 10 seconds while the page is visible. Failed quotes are labelled as last-known prices. Failed database reads preserve and label the previous snapshot.

## Valuation and history

- Portfolio value = saved cash + saved BTC × most recent available BTC price. Displayed dollar amounts represent **USDT**, not a USD conversion.
- P&L includes fees already reflected in saved balances. With zero initial BTC, the baseline is initial cash. With initial BTC, it uses the first recorded mark price and is labelled “since first valuation.”
- Cumulative trading fees sum `fee_equivalent_usdt` across the entire current session. BTC fees use the trade's fill price for their USDT equivalent. The total is independent of the chart range and history cap.
- Recorded OpenRouter costs sum `openrouter_cost_usd` across the current session and remain separate from portfolio P&L. Missing costs are labelled rather than treated as free calls. Tiny USD costs retain up to 12 decimal places. Both cost fields are also included in decision details and CSV exports.
- The GAS reads the Decisions API's `usage.cost` and saves it on BUY, SELL, HOLD, and SKIP runs. If a returned decision is invalid or the later market quote fails, its reported cost is preserved on the ERROR run. Missing or invalid cost data is stored as null.
- The chart uses recorded quote timestamps and mark prices, plus the latest live valuation. It does not recalculate historical balances using today's price or invent intermediate ticks.
- History supports 6 hours, 24 hours, and 7 days. Reads paginate in 500-row batches, with a visible coverage message if the 5,000-row cap is reached. Counts, filters, and CSV exports refer to the selected period.
- Holds, skipped trades, and errors remain visible. Model input values are shown as stored, without recomputing indicators.
- All journal timestamps are displayed in UTC. Update status follows the current session timeframe: a run older than two candle intervals is labelled as awaiting an update (30 minutes for a 15m session). A connected data feed does not imply the GAS is running.
- Strategy labels and the trade sizing range use the current Supabase session settings. Model inputs show the timeframe saved with that run, falling back to the session timeframe when no recorded timeframe is available; older 5m inputs keep their original label.

## Checks

```sh
npm run lint
npm run build
```
