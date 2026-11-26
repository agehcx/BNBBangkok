# Status (updated 2026-11-26)

## Done
- Foundry contracts: `CoreProtocolVault`, `MockAtlasOracle`, `MockRWA`, `IAtlasOracle`, deploy script; 11 passing tests.
- Next.js 14 app: `/api/market` (CMC proxy, mock fallback), `/api/agent` (Cournot proxy, labelled fallback), Gmail-style dashboard with view switching, CSS motion.
- `verify-integrations.ts`, README, design docs. All pushed to `main`.

## Not done
- [ ] Deploy contracts to BSC Testnet and set `NEXT_PUBLIC_VAULT_ADDRESS` (until then on-chain panels show "-" and wallet buttons are disabled).
- [ ] Confirm the real Atlas BSC Testnet feed address/ABI (deploy uses `MockAtlasOracle` unless `ATLAS_ORACLE` is set).
- [ ] Wire the real Cournot API (`/api/agent` expects `COURNOT_API_URL` accepting `POST {claim}` and returning `{probability, evidence}`).
- [ ] Add `CMC_PRO_API_KEY`; run `npm run verify` and keep the output.
- [ ] Verify the contract on BscScan; deploy web to Vercel.
- [ ] Submission artifacts: one-page write-up, demo video, checklist.
- [ ] BNB cube logo in the header (A/R placeholder tiles for now).
- [ ] End-to-end browser test with a wallet.

## Notes
`logs/cournot-verification.json` is written by the app on every agent query. Commit it only when it holds real Cournot output.
