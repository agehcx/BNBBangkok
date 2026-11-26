# Tech notes

## Stack
- `contracts/`: Solidity 0.8.24, Foundry (forge-std vendored in `contracts/lib`).
- `web/`: Next.js 14 App Router, TypeScript, Tailwind 3, wagmi v2, viem, RainbowKit, TanStack Query.
- Network: BSC Testnet (chain 97), RPC `https://data-seed-prebsc-1-s1.binance.org:8545/`.

## Risk logic
`executeRiskAction(feedId, actionType, expectedPrice)` is permissionless. Action 1 (defensive) needs deviation of at least 1.5%, action 2 (circuit break) at least 3%, or a feed older than 1 hour. Only the owner can reset via `setEmergencyPause(false)`. Withdrawals stay open when the circuit is broken. Feed id is `keccak256("XAU/USD")`; oracle decimals are 8.

## Commands
```bash
cd contracts && forge test
cd web && npm install && npm run dev
cd web && npm run verify      # CMC + Atlas connectivity proof
```

## Gotchas
- Restart `npm run dev` after adding colors to `tailwind.config.ts`; the dev server does not reliably reload them (symptom: invisible text, missing `bg-*` classes).
- `next.config.mjs` aliases optional `@x402/*` modules to false; without it the build fails through `@coinbase/cdp-sdk`.
- `NEXT_PUBLIC_WC_PROJECT_ID` falls back to `demo`; use a real WalletConnect/Reown id in production.
- Google Fonts (Pixelify Sans, Space Grotesk) need network at build.
- CMC and Cournot keys stay server-side (`/api/*` only).
