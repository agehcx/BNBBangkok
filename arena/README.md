# TrustedPrice: Poison Arena

Two AI agents face the same manipulated price. The **Naive Agent** trusts one feed and gets wrecked. The **Guarded Agent** cross-checks **CoinMarketCap** against **Atlas on-chain feeds (BNB Chain)**, refuses to act on untrustworthy data, and explains why.

BNB Bangkok 2026 · Developer Track + CoinMarketCap × Atlas Challenge.

## Run

```bash
cd arena
npm install
cp .env.example .env.local   # optional — empty values fall back to MockSource
npm run dev                  # http://localhost:3001
```

## Env vars (server-side only)

| var | purpose |
| --- | --- |
| `CMC_API_KEY` | CoinMarketCap Pro key → `CmcSource` goes LIVE |
| `BSC_RPC_URL` | BSC RPC for on-chain reads (default public dataseed) |
| `ATLAS_FEED_ADDRESS_BNB` | Atlas Chainlink-compatible feed → `AtlasSource` goes LIVE |
| `LLM_API_KEY` | optional, for LLM rationale (not wired yet) |

Keys are only read in `arena/src/lib/sources` (marked `server-only`). The browser only calls `/api/price`.

## Layout

```
arena/src/
  app/api/price/route.ts   GET /api/price?symbol=BNB → prices, verdict, proof
  lib/sources/             CmcSource, AtlasSource (raw eth_call latestRoundData), MockSource
  lib/trust.ts             deterministic trust engine (gap %, staleness, consensus)
  lib/scenario.ts          seeded scenario generator: normal | spike | stale | conflict
  lib/agents.ts            naive vs guarded agents, PnL vs true price
  lib/config.ts            all thresholds & strategy params (tunable)
  components/              pixel UI: Arena, PriceChart, AgentPanel, VerdictPanel, ProofPanel
```

## Real vs simulated

- **REAL (when env set):** CMC quote + Atlas on-chain read in `/api/price` → shown in the Proof panel and used as the arena baseline.
- **SIMULATED:** every arena tick (attacks injected on a seeded walk around the baseline). The UI shows a SIMULATION badge.
- No LLM computes numbers. Rationale text is deterministic.

Not financial advice. Read-only; no transactions.
