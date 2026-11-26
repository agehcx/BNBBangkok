export type SourceId = "cmc" | "atlas";
export type Verdict = "trust" | "caution" | "refuse";
export type ScenarioType = "normal" | "spike" | "stale" | "conflict";

export interface Quote {
  price: number;
  ts: number; // unix seconds
}

export interface Reason {
  code:
    | "GAP_OK"
    | "GAP_CAUTION"
    | "GAP_REFUSE"
    | "STALE_CAUTION"
    | "STALE_REFUSE"
    | "SINGLE_SOURCE"
    | "NO_FRESH_SOURCE"
    | "CONSENSUS_LOW";
  level: Verdict;
  message: string;
}

export interface TrustResult {
  verdict: Verdict;
  gapPct: number;
  staleSec: Record<SourceId, number>;
  consensusScore?: number;
  reasons: Reason[];
  verifiedPrice: number | null; // price the guarded agent may act on
  usedSources: SourceId[];
}

export interface Tick {
  i: number;
  ts: number;
  truePrice: number;
  cmc: Quote;
  atlas: Quote;
  attack: boolean; // injected (simulated) data active on the poisoned source
}

export type ActionKind = "SELL" | "BUY" | "HOLD" | "REFUSE";

export interface AgentAction {
  kind: ActionKind;
  price: number | null; // fill price
  qtyBnb: number;
  sizeFactor: number;
  note: string;
}

export interface AgentSnapshot {
  action: AgentAction;
  bnb: number;
  usdt: number;
  valueUsd: number; // marked at TRUE price
  pnlUsd: number;
  pnlPct: number;
}

export interface Frame {
  tick: Tick;
  trust: TrustResult;
  naive: AgentSnapshot & { observed: number };
  guarded: AgentSnapshot & { rationale: string };
}

// /api/price response
export interface PriceProof {
  cmc: { mode: "live" | "mock"; ts: number; requestTs?: string; creditCount?: number; error?: string };
  atlas: {
    mode: "live" | "mock";
    block?: number;
    address?: string;
    updatedAt?: number;
    source: "onchain" | "api" | "mock";
    error?: string;
  };
}

export interface PriceResponse {
  symbol: string;
  cmcPrice: number;
  atlasPrice: number;
  atlasConsensusScore?: number;
  gapPct: number;
  verdict: Verdict;
  reasons: string[];
  proof: PriceProof;
  fetchedAt: number;
}
