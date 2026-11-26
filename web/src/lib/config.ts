// All tunable numbers live here. Thresholds are assumptions from the spec — tune freely.

export const SYMBOLS = ["BNB"] as const;
export type SymbolId = (typeof SYMBOLS)[number];

export type AssetClass = "volatile" | "stable";
export const ASSET_CLASS: Record<SymbolId, AssetClass> = { BNB: "volatile" };

export const TRUST_CONFIG = {
  gap: {
    volatile: { caution: 0.5, refuse: 2 }, // %
    stable: { caution: 0.2, refuse: 0.5 }, // %
  },
  staleCautionSec: 60,
  staleRefuseSec: 300,
  consensusLow: 0.7, // optional Atlas consensus score (0..1). Below → downgrade one level.
};

export const SIM_CONFIG = {
  tickSeconds: 10, // simulated seconds per tick
  ticks: 60,
  defaultSeed: 1127,
  fallbackBaseline: 650, // used only when /api/price is unreachable
};

export const STRATEGY = {
  window: 6, // ticks of lookback
  dropPct: 3, // sell to USDT if price drops this much from window high
  recoverPct: 3, // buy back if price rises this much from window low
  cooldown: 3, // ticks to wait after a trade
  cautionSize: 0.5, // size factor on CAUTION
  startUsd: 10_000,
};
