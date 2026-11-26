"use client";
import type { ActionKind, Frame } from "@/lib/types";
import { Sprite } from "./Sprite";

type Side = "naive" | "guarded";

interface FeedItem {
  from: number;
  to: number;
  kind: ActionKind;
  text: string;
  attack: boolean;
}

function buildFeed(frames: Frame[], side: Side): FeedItem[] {
  const out: FeedItem[] = [];
  for (const f of frames) {
    const a = f[side].action;
    if (a.kind === "HOLD") continue;
    const prev = out[out.length - 1];
    if (a.kind === "REFUSE" && prev?.kind === "REFUSE" && prev.to === f.tick.i - 1) {
      prev.to = f.tick.i;
      continue;
    }
    const text =
      a.kind === "REFUSE"
        ? f.trust.reasons.filter((r) => r.level === "refuse").map((r) => r.code).join(" + ")
        : `${a.qtyBnb.toFixed(2)} BNB @ $${a.price!.toFixed(2)}${a.sizeFactor < 1 ? ` (${a.sizeFactor * 100}%)` : ""}`;
    out.push({ from: f.tick.i, to: f.tick.i, kind: a.kind, text, attack: f.tick.attack });
  }
  return out.reverse();
}

const KIND_COLOR: Record<ActionKind, string> = {
  SELL: "text-red",
  BUY: "text-green",
  HOLD: "text-muted",
  REFUSE: "text-amber",
};

export function AgentPanel({ side, frames, idx, sourceLabel }: { side: Side; frames: Frame[]; idx: number; sourceLabel: string }) {
  const shown = frames.slice(0, idx + 1);
  const cur = shown[shown.length - 1];
  const snap = cur[side];
  const feed = buildFeed(shown, side);
  const fooled = side === "naive" && cur.tick.attack && (snap.action.kind === "SELL" || snap.action.kind === "BUY");
  const blocked = side === "guarded" && snap.action.kind === "REFUSE";
  const bnbVal = snap.bnb * cur.tick.truePrice;
  const bnbPct = (bnbVal / Math.max(1, snap.valueUsd)) * 100;
  const pnlColor = snap.pnlUsd >= 0 ? "text-green" : "text-red";
  const isNaive = side === "naive";

  return (
    <section className={`px-box ${fooled ? "danger shake" : blocked ? "warn" : isNaive ? "" : "hot"} flex h-full flex-col p-4`} aria-label={`${side} agent`}>
      <header className="flex items-center gap-3">
        <Sprite name={side} size={52} />
        <div className="min-w-0">
          <h2 className="px-title">{isNaive ? "Naive Agent" : "Guarded Agent"}</h2>
          <p className="text-muted mt-1 text-lg leading-tight">{sourceLabel}</p>
        </div>
      </header>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <div className="text-muted font-pixel text-[9px]">PNL vs TRUE PRICE</div>
          <div className={`font-pixel mt-2 text-xl ${pnlColor}`}>
            {snap.pnlUsd >= 0 ? "+" : "-"}${Math.abs(snap.pnlUsd).toFixed(0)}
          </div>
        </div>
        <div className={`font-pixel text-xs ${pnlColor}`}>
          {snap.pnlPct >= 0 ? "+" : ""}
          {snap.pnlPct.toFixed(2)}%
        </div>
      </div>

      {/* holdings bar */}
      <div className="mt-4">
        <div className="flex h-4 w-full bg-green-4" role="img" aria-label={`${bnbPct.toFixed(0)}% BNB`}>
          <div className="h-full bg-amber" style={{ width: `${bnbPct}%` }} />
          <div className="h-full flex-1 bg-cyan/70" />
        </div>
        <div className="text-muted mt-1 flex justify-between text-lg">
          <span>BNB {snap.bnb.toFixed(2)}</span>
          <span>USDT {snap.usdt.toFixed(0)}</span>
        </div>
      </div>

      <div className="mt-3 flex min-h-8 items-center">
        {fooled && <span className="chip refuse blink">FOOLED BY POISON!</span>}
        {blocked && <span className="chip caution">ATTACK BLOCKED</span>}
        {!fooled && !blocked && <span className="text-muted text-lg">&gt; {snap.action.kind.toLowerCase()} · {snap.action.note}</span>}
      </div>

      <div className="px-title mt-3 text-[9px]">Action feed</div>
      <ol className="px-scroll mt-2 max-h-56 flex-1 space-y-1 overflow-y-auto pr-1 lg:max-h-none" aria-live="polite">
        {feed.length === 0 && <li className="text-muted">waiting for signal…</li>}
        {feed.map((it) => (
          <li key={`${it.from}-${it.kind}`} className="bg-panel-2 flex gap-2 px-2 py-1 text-lg leading-tight">
            <span className="text-muted w-14 shrink-0">#{it.from}{it.to !== it.from ? `-${it.to}` : ""}</span>
            <span className={`${KIND_COLOR[it.kind]} w-16 shrink-0`}>{it.kind}</span>
            <span className="min-w-0 break-words">
              {it.text}
              {it.attack && isNaive && <span className="text-red"> ☠</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
