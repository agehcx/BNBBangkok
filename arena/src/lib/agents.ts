import { ASSET_CLASS, STRATEGY, type SymbolId } from "./config";
import { rationaleFor } from "./rationale";
import { evaluateTrust } from "./trust";
import type { AgentAction, AgentSnapshot, Frame, SourceId, Tick } from "./types";

interface AgentState {
  bnb: number;
  usdt: number;
  cooldown: number;
  history: number[];
}

const newState = (startPrice: number): AgentState => ({
  bnb: STRATEGY.startUsd / startPrice,
  usdt: 0,
  cooldown: 0,
  history: [],
});

/** Toy strategy shared by both agents: sell on a 3% drop, buy back on a 3% recovery. */
function strategyStep(s: AgentState, observed: number, fill: number, sizeFactor: number): AgentAction {
  s.history.push(observed);
  if (s.history.length > STRATEGY.window) s.history.shift();
  if (s.cooldown > 0) {
    s.cooldown--;
    return { kind: "HOLD", price: null, qtyBnb: 0, sizeFactor, note: "cooldown" };
  }
  const hi = Math.max(...s.history);
  const lo = Math.min(...s.history);

  if (s.bnb > 1e-9 && observed <= hi * (1 - STRATEGY.dropPct / 100)) {
    const qty = s.bnb * sizeFactor;
    s.bnb -= qty;
    s.usdt += qty * fill;
    s.cooldown = STRATEGY.cooldown;
    return { kind: "SELL", price: fill, qtyBnb: qty, sizeFactor, note: `drop ≥${STRATEGY.dropPct}% from window high` };
  }
  if (s.usdt > 1e-6 && observed >= lo * (1 + STRATEGY.recoverPct / 100)) {
    const usd = s.usdt * sizeFactor;
    const qty = usd / fill;
    s.usdt -= usd;
    s.bnb += qty;
    s.cooldown = STRATEGY.cooldown;
    return { kind: "BUY", price: fill, qtyBnb: qty, sizeFactor, note: `recovery ≥${STRATEGY.recoverPct}% from window low` };
  }
  return { kind: "HOLD", price: null, qtyBnb: 0, sizeFactor, note: "no signal" };
}

function snapshot(s: AgentState, action: AgentAction, truePrice: number): AgentSnapshot {
  const valueUsd = s.bnb * truePrice + s.usdt;
  const pnlUsd = valueUsd - STRATEGY.startUsd;
  return { action, bnb: s.bnb, usdt: s.usdt, valueUsd, pnlUsd, pnlPct: (pnlUsd / STRATEGY.startUsd) * 100 };
}

/** Run the whole simulation up-front; the UI just plays frames back. */
export function runArena(ticks: Tick[], poisoned: SourceId, symbol: SymbolId = "BNB"): Frame[] {
  const naive = newState(ticks[0].truePrice);
  const guarded = newState(ticks[0].truePrice);

  return ticks.map((tick) => {
    // NAIVE: trusts the single (poisoned) source and fills at that price.
    const observed = tick[poisoned].price;
    const nAction = strategyStep(naive, observed, observed, 1);

    // GUARDED: cross-check first.
    const trust = evaluateTrust({ cmc: tick.cmc, atlas: tick.atlas, now: tick.ts, assetClass: ASSET_CLASS[symbol] });
    let gAction: AgentAction;
    if (trust.verdict === "refuse" || trust.verifiedPrice === null) {
      if (guarded.cooldown > 0) guarded.cooldown--;
      gAction = { kind: "REFUSE", price: null, qtyBnb: 0, sizeFactor: 0, note: "data untrusted" };
    } else {
      const size = trust.verdict === "trust" ? 1 : STRATEGY.cautionSize;
      gAction = strategyStep(guarded, trust.verifiedPrice, trust.verifiedPrice, size);
    }

    return {
      tick,
      trust,
      naive: { ...snapshot(naive, nAction, tick.truePrice), observed },
      guarded: { ...snapshot(guarded, gAction, tick.truePrice), rationale: rationaleFor(trust, gAction) },
    };
  });
}
