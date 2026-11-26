"use client";
import { TRUST_CONFIG } from "@/lib/config";
import type { Frame } from "@/lib/types";

export function VerdictPanel({ frame }: { frame: Frame }) {
  const { trust, guarded, tick } = frame;
  const v = trust.verdict;
  const boxTone = v === "trust" ? "hot" : v === "caution" ? "warn" : "danger";
  const staleTone = (s: number) => (s > TRUST_CONFIG.staleRefuseSec ? "text-red" : s > TRUST_CONFIG.staleCautionSec ? "text-amber" : "text-green");

  const traceInput = {
    tick: tick.i,
    cmc: { price: +tick.cmc.price.toFixed(4), ts: tick.cmc.ts },
    atlas: { price: +tick.atlas.price.toFixed(4), ts: tick.atlas.ts },
    gapPct: +trust.gapPct.toFixed(4),
    staleSec: trust.staleSec,
    consensusScore: trust.consensusScore ?? null,
  };

  return (
    <section className={`px-box ${boxTone} p-4`} aria-label="Trust verdict">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="px-title">Trust verdict</h2>
        <span className={`chip ${v} text-[11px]`}>{v.toUpperCase()}</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="GAP" value={`${trust.gapPct.toFixed(2)}%`} tone={v === "trust" ? "text-green" : trust.gapPct >= 2 ? "text-red" : "text-amber"} />
        <Stat label="CMC AGE" value={`${trust.staleSec.cmc}s`} tone={staleTone(trust.staleSec.cmc)} />
        <Stat label="ATLAS AGE" value={`${trust.staleSec.atlas}s`} tone={staleTone(trust.staleSec.atlas)} />
        <Stat label="CONSENSUS" value={trust.consensusScore?.toFixed(2) ?? "N/A"} tone="text-muted" />
      </dl>

      <ul className="mt-4 space-y-1">
        {trust.reasons.map((r) => (
          <li key={r.code + r.message} className="flex items-start gap-2 text-lg leading-tight">
            <span className={r.level === "trust" ? "text-green" : r.level === "caution" ? "text-amber" : "text-red"}>■</span>
            <span>
              <span className="text-muted">{r.code}</span> {r.message}
            </span>
          </li>
        ))}
      </ul>

      <details className="bg-panel-2 mt-4 p-3">
        <summary className="px-title text-[9px]">▶ AI decision trace</summary>
        <ol className="mt-3 space-y-2 text-lg leading-tight">
          <li>
            <span className="text-muted">1 INPUTS (computed in code)</span>
            <pre className="px-scroll text-ink mt-1 overflow-x-auto text-base">{JSON.stringify(traceInput, null, 1)}</pre>
          </li>
          <li>
            <span className="text-muted">2 VERDICT</span> <span className={`chip ${v}`}>{v.toUpperCase()}</span>
          </li>
          <li>
            <span className="text-muted">3 ACTION</span> {guarded.action.kind}
            {guarded.action.price ? ` @ $${guarded.action.price.toFixed(2)}` : ""}
            {guarded.action.sizeFactor > 0 && guarded.action.kind !== "HOLD" ? ` · size ${guarded.action.sizeFactor}` : ""}
          </li>
          <li>
            <span className="text-muted">4 RATIONALE (deterministic fallback; LLM optional)</span>
            <p className="mt-1">{guarded.rationale}</p>
          </li>
        </ol>
      </details>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-panel-2 p-2">
      <dt className="text-muted font-pixel text-[8px]">{label}</dt>
      <dd className={`font-pixel mt-2 text-sm ${tone}`}>{value}</dd>
    </div>
  );
}
