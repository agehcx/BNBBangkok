import { TRUST_CONFIG, type AssetClass } from "./config";
import type { Quote, Reason, SourceId, TrustResult, Verdict } from "./types";

const RANK: Record<Verdict, number> = { trust: 0, caution: 1, refuse: 2 };
const BY_RANK: Verdict[] = ["trust", "caution", "refuse"];
const NAME: Record<SourceId, string> = { cmc: "CMC", atlas: "Atlas" };

export interface TrustInput {
  cmc: Quote;
  atlas: Quote;
  now: number;
  assetClass: AssetClass;
  consensusScore?: number;
}

/** Deterministic trust engine. No LLM, no randomness. */
export function evaluateTrust(input: TrustInput, cfg = TRUST_CONFIG): TrustResult {
  const { cmc, atlas, now, assetClass, consensusScore } = input;
  const quotes: Record<SourceId, Quote> = { cmc, atlas };
  const gapTh = cfg.gap[assetClass];

  const staleSec: Record<SourceId, number> = {
    cmc: Math.max(0, now - cmc.ts),
    atlas: Math.max(0, now - atlas.ts),
  };
  const gapPct = (Math.abs(cmc.price - atlas.price) / ((cmc.price + atlas.price) / 2)) * 100;

  const reasons: Reason[] = [];
  let level = 0;
  const bump = (v: Verdict) => (level = Math.max(level, RANK[v]));

  // 1. Staleness — a stale source is excluded from the cross-check.
  const fresh: SourceId[] = [];
  for (const id of ["cmc", "atlas"] as SourceId[]) {
    const s = staleSec[id];
    if (s > cfg.staleRefuseSec) {
      bump("refuse");
      reasons.push({ code: "STALE_REFUSE", level: "refuse", message: `${NAME[id]} feed stale ${s}s > ${cfg.staleRefuseSec}s` });
    } else if (s > cfg.staleCautionSec) {
      bump("caution");
      reasons.push({ code: "STALE_CAUTION", level: "caution", message: `${NAME[id]} feed stale ${s}s > ${cfg.staleCautionSec}s — excluded` });
    } else {
      fresh.push(id);
    }
  }

  // 2. Cross-source gap.
  if (fresh.length === 2) {
    const g = gapPct.toFixed(2);
    if (gapPct >= gapTh.refuse) {
      bump("refuse");
      reasons.push({ code: "GAP_REFUSE", level: "refuse", message: `CMC vs Atlas gap ${g}% ≥ ${gapTh.refuse}%` });
    } else if (gapPct >= gapTh.caution) {
      bump("caution");
      reasons.push({ code: "GAP_CAUTION", level: "caution", message: `CMC vs Atlas gap ${g}% ≥ ${gapTh.caution}%` });
    } else {
      reasons.push({ code: "GAP_OK", level: "trust", message: `CMC vs Atlas gap ${g}% < ${gapTh.caution}%` });
    }
  } else if (fresh.length === 1) {
    bump("caution");
    reasons.push({ code: "SINGLE_SOURCE", level: "caution", message: `Cross-check unavailable — only ${NAME[fresh[0]]} is fresh` });
  } else {
    bump("refuse");
    reasons.push({ code: "NO_FRESH_SOURCE", level: "refuse", message: "No fresh source available" });
  }

  // 3. Optional Atlas consensus score.
  if (consensusScore !== undefined && consensusScore < cfg.consensusLow) {
    level = Math.min(2, level + 1);
    reasons.push({ code: "CONSENSUS_LOW", level: BY_RANK[level], message: `Atlas consensus ${consensusScore.toFixed(2)} < ${cfg.consensusLow}` });
  }

  const verdict = BY_RANK[level];
  const verifiedPrice =
    verdict === "refuse" || fresh.length === 0
      ? null
      : fresh.reduce((a, id) => a + quotes[id].price, 0) / fresh.length;

  return { verdict, gapPct, staleSec, consensusScore, reasons, verifiedPrice, usedSources: fresh };
}
