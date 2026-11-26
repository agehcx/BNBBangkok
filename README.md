# Aura Protocol — BNB Chain RWA risk engine

Dual-oracle risk pipeline: CoinMarketCap (off-chain market depth/volatility) + Cournot (claim probability) drive an agent; `CoreProtocolVault` benchmarks against an Atlas oracle feed on BSC Testnet (97) and circuit-breaks on divergence or stale data.

## Run
```bash
# contracts
cd contracts && forge test
PRIVATE_KEY=0x... forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast --private-key $PRIVATE_KEY
# set ATLAS_ORACLE=0x... first to use the canonical Atlas feed; otherwise MockAtlasOracle is deployed

# web
cd web && cp .env.local.example .env.local   # fill keys + deployed addresses
npm install && npm run dev
npm run verify                               # CMC + Atlas connectivity proof
```

## Layout
- `contracts/src` — `CoreProtocolVault`, `MockAtlasOracle`, `MockRWA`, `interfaces/IAtlasOracle`
- `web/src/app/api/market` — CMC proxy (key stays server-side, mock fallback)
- `web/src/app/api/agent` — Cournot proxy; appends sanitized records to `logs/cournot-verification.json`
- Risk thresholds: defensive ≥1.5% deviation, circuit ≥3%, or feed stale >1h. Owner resets via `setEmergencyPause(false)`.

## Known gaps
- Cournot's real endpoint/schema is unknown: `/api/agent` expects `COURNOT_API_URL` to accept `POST {claim}` → `{probability, evidence}`, else falls back to a CMC-volatility estimate (labelled `fallback` in UI/logs — do not submit fallback logs as Cournot proof).
- The Atlas BSC Testnet feed address/ABI was not verified; set `ATLAS_ORACLE` / `NEXT_PUBLIC_ATLAS_ORACLE_ADDRESS` from the CMC×Atlas docs.

## Docs
- [docs/HACKATHON.md](docs/HACKATHON.md) — goal, tracks, deadline, deliverables
- [docs/STATUS.md](docs/STATUS.md) — what is done and what is left
- [docs/TECH.md](docs/TECH.md) — stack, risk logic, gotchas
- [docs/DESIGN.md](docs/DESIGN.md) — palette, type, layout, background
