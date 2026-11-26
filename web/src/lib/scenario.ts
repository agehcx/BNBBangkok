import { SIM_CONFIG } from "./config";
import type { ScenarioType, SourceId, Tick } from "./types";

/** mulberry32 — small seeded PRNG so demo runs are reproducible. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(r: () => number) {
  const u = Math.max(r(), 1e-12);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const SCENARIOS: Record<ScenarioType, { label: string; blurb: string; attackFrom: number; attackTo: number }> = {
  normal: { label: "NORMAL", blurb: "Clean data + one genuine dip. Both agents should behave the same.", attackFrom: -1, attackTo: -1 },
  spike: { label: "SPIKE", blurb: "Poisoned feed flashes -8% for 8 ticks while the real market is flat.", attackFrom: 20, attackTo: 27 },
  stale: { label: "STALE", blurb: "Poisoned feed freezes while the real market crashes -10%.", attackFrom: 10, attackTo: Infinity },
  conflict: { label: "CONFLICT", blurb: "Poisoned feed drifts ~4.5% below truth and stays there.", attackFrom: 15, attackTo: Infinity },
};

export interface ScenarioParams {
  type: ScenarioType;
  baseline: number;
  seed: number;
  poisoned: SourceId;
  startTs?: number;
}

/** Generate the full tick series. Everything here is SIMULATED on top of the baseline. */
export function generateTicks({ type, baseline, seed, poisoned, startTs }: ScenarioParams): Tick[] {
  const r = rng(seed);
  const { ticks, tickSeconds } = SIM_CONFIG;
  const t0 = startTs ?? 1_764_000_000;
  const out: Tick[] = [];
  const spec = SCENARIOS[type];

  let walk = baseline;
  let frozen: { price: number; ts: number } | null = null;

  for (let i = 0; i < ticks; i++) {
    const ts = t0 + i * tickSeconds;

    // ---- true price ----
    walk *= 1 + gaussian(r) * 0.0012 + (type === "conflict" ? 0.0006 : 0);
    let shape = 1;
    if (type === "normal") {
      // genuine dip -4.5% over ticks 22..28, recovery by 34
      if (i >= 22 && i <= 28) shape = 1 - 0.045 * ((i - 21) / 7);
      else if (i > 28 && i <= 34) shape = 1 - 0.045 * (1 - (i - 28) / 6);
    }
    if (type === "stale" && i >= 13) shape = 1 - 0.1 * Math.min(1, (i - 12) / 7); // real crash
    const truePrice = walk * shape;

    // ---- sources: independent small noise around truth ----
    const noisy = () => truePrice * (1 + gaussian(r) * 0.0006);
    const q = { cmc: { price: noisy(), ts }, atlas: { price: noisy(), ts } };

    // ---- inject attack on the poisoned source ----
    const attack = i >= spec.attackFrom && i <= spec.attackTo && spec.attackFrom >= 0;
    if (attack) {
      const p = q[poisoned];
      if (type === "spike") p.price = truePrice * 0.92;
      if (type === "conflict") p.price = truePrice * (1 - 0.045 * Math.min(1, (i - spec.attackFrom + 1) / 3));
      if (type === "stale") {
        frozen ??= { price: p.price, ts };
        p.price = frozen.price;
        p.ts = frozen.ts;
      }
    }

    out.push({ i, ts, truePrice, cmc: q.cmc, atlas: q.atlas, attack });
  }
  return out;
}
