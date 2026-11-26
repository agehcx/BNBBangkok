# Hackathon: goal, tracks, deliverables

**Project:** Aura Protocol, a dual-oracle risk engine for tokenized RWAs on BNB Chain. Off-chain CoinMarketCap volatility and Cournot claim probability drive an agent; the on-chain vault benchmarks against an Atlas oracle feed and circuit-breaks on divergence or staleness.

## Target tracks
| Track | Pool |
|-------|------|
| Developer Track (RWA + on-chain AI agent) | $10,000 |
| CoinMarketCap x Atlas Challenge | $10,000 |
| Cournot Intelligence Oracle | $2,000 |

## Deadline
Per the submission brief: Thursday, 27 November 2026, 09:00 Bangkok time (UTC+7). The weekday and date disagree (27 Nov 2026 is a Friday), so confirm the real cutoff on HackQuest.

## Deliverables
- [ ] HackQuest project URL
- [ ] Public GitHub repo (github.com/agehcx/BNBBangkok)
- [ ] Live demo (Vercel)
- [ ] 3-minute demo video (under 180s)
- [ ] Verified BSC Testnet contract address
- [ ] CMC x Atlas one-page write-up: problem and audience, endpoints/feeds used and why both, BNB deployments, roadmap
- [ ] Cournot proof: UI shows claim, probability and evidence; sanitized request-ID log in `logs/cournot-verification.json` (real Cournot output only, not the fallback)

## Demo video outline
| Time | Beat |
|------|------|
| 0:00 | Problem: RWA price lags or thin liquidity |
| 0:40 | Product: live CMC volatility and Atlas on-chain feed |
| 1:30 | Simulate deviation, query Cournot, fire circuit breaker tx |
| 2:15 | BscScan: verify `RiskActionExecuted` event |
| 2:45 | Roadmap and wrap-up |
