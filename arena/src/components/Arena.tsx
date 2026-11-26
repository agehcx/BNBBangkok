"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SIM_CONFIG, STRATEGY } from "@/lib/config";
import { runArena } from "@/lib/agents";
import { generateTicks, SCENARIOS } from "@/lib/scenario";
import type { PriceResponse, ScenarioType, SourceId } from "@/lib/types";
import { AgentPanel } from "./AgentPanel";
import { PixelLogo } from "./PixelLogo";
import { PriceChart } from "./PriceChart";
import { ProofPanel } from "./ProofPanel";
import { VerdictPanel } from "./VerdictPanel";

const SPEEDS = [1, 2, 4] as const;
const NAME: Record<SourceId, string> = { cmc: "CMC", atlas: "ATLAS" };

export function Arena() {
  const [scenario, setScenario] = useState<ScenarioType>("spike");
  const [poisoned, setPoisoned] = useState<SourceId>("atlas");
  const [seed, setSeed] = useState<number>(SIM_CONFIG.defaultSeed);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [live, setLive] = useState<PriceResponse | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  const fetchLive = useCallback(async () => {
    setLiveLoading(true);
    setLiveError(null);
    try {
      const r = await fetch("/api/price?symbol=BNB", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setLive(await r.json());
    } catch (e) {
      setLiveError((e as Error).message);
    } finally {
      setLiveLoading(false);
    }
  }, []);
  useEffect(() => void fetchLive(), [fetchLive]);

  // Baseline: real snapshot when available (CMC price), else fallback.
  const baseline = live ? (live.cmcPrice + live.atlasPrice) / 2 : SIM_CONFIG.fallbackBaseline;
  const frames = useMemo(
    () => runArena(generateTicks({ type: scenario, baseline, seed, poisoned }), poisoned),
    [scenario, baseline, seed, poisoned],
  );

  const last = frames.length - 1;
  const done = idx >= last;
  useEffect(() => {
    if (!playing) return;
    if (done) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIdx((i) => Math.min(last, i + 1)), 400 / speed);
    return () => clearTimeout(t);
  }, [playing, idx, done, last, speed]);

  const reset = () => {
    setPlaying(false);
    setIdx(0);
  };
  const pick = (s: ScenarioType) => {
    setScenario(s);
    reset();
  };
  const start = () => {
    if (done) setIdx(0);
    setPlaying(true);
  };

  const frame = frames[idx];
  const spec = SCENARIOS[scenario];
  const attackRange: [number, number] | null = spec.attackFrom >= 0 ? [spec.attackFrom, Math.min(spec.attackTo, last)] : null;
  const attackLive = frame.tick.attack;
  const honest: SourceId = poisoned === "cmc" ? "atlas" : "cmc";
  const saved = frame.guarded.pnlUsd - frame.naive.pnlUsd;

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6">
      {/* ---------- header ---------- */}
      <header className="flex flex-wrap items-center gap-4">
        <div className="px-box hot p-1">
          <PixelLogo size={76} res={36} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-pixel text-green text-lg leading-snug sm:text-2xl" style={{ textShadow: "4px 4px 0 #000, 0 0 12px rgba(61,255,116,.45)" }}>
            TRUSTEDPRICE
          </h1>
          <p className="font-pixel text-ink mt-2 text-[10px] sm:text-xs">
            POISON ARENA <span className="text-muted">{"// two agents · one poisoned price"}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip mock">BNB CHAIN</span>
          <span className="chip mock">CMC × ATLAS</span>
          <span className={`chip ${live?.proof.cmc.mode === "live" ? "trust" : "mock"}`}>CMC {live?.proof.cmc.mode?.toUpperCase() ?? "…"}</span>
          <span className={`chip ${live?.proof.atlas.mode === "live" ? "trust" : "mock"}`}>ATLAS {live?.proof.atlas.mode?.toUpperCase() ?? "…"}</span>
          {(playing || idx > 0) && <span className="chip sim">▲ SIMULATION</span>}
        </div>
      </header>

      {/* ---------- controls ---------- */}
      <section className="px-box mt-6 p-4" aria-label="Scenario controls">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-1">
            <span className="px-title mr-2 text-[9px]">Scenario</span>
            {(Object.keys(SCENARIOS) as ScenarioType[]).map((s) => (
              <button key={s} className="px-btn ghost" aria-pressed={scenario === s} onClick={() => pick(s)}>
                {SCENARIOS[s].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="px-title mr-2 text-[9px]">Poison</span>
            {(["cmc", "atlas"] as SourceId[]).map((s) => (
              <button
                key={s}
                className="px-btn ghost"
                aria-pressed={poisoned === s}
                onClick={() => {
                  setPoisoned(s);
                  reset();
                }}
              >
                {NAME[s]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="px-title mr-2 text-[9px]">Speed</span>
            {SPEEDS.map((s) => (
              <button key={s} className="px-btn ghost" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                {s}x
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <span className="px-title text-[9px]">Seed</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => {
                setSeed(Number(e.target.value) || 0);
                reset();
              }}
              className="bg-panel-2 text-green w-24 border-2 border-green-3 px-2 py-1 outline-none focus:border-green"
            />
          </label>
          <div className="ml-auto flex items-center gap-1">
            {playing ? (
              <button className="px-btn" onClick={() => setPlaying(false)}>
                ❚❚ PAUSE
              </button>
            ) : (
              <button className={`px-btn ${scenario !== "normal" ? "danger" : ""}`} onClick={start}>
                {done ? "↺ REPLAY" : scenario === "normal" ? "▶ RUN" : idx > 0 ? "▶ RESUME" : "☠ INJECT ATTACK"}
              </button>
            )}
            <button className="px-btn ghost" onClick={reset}>
              RESET
            </button>
          </div>
        </div>
        <p className="text-muted mt-3 text-lg leading-tight">
          <span className="text-ink">&gt; {spec.label}:</span> {spec.blurb}{" "}
          {scenario !== "normal" && (
            <>
              Poison target: <span className="text-red">{NAME[poisoned]}</span>. Naive reads {NAME[poisoned]} only; Guarded cross-checks with {NAME[honest]}.
            </>
          )}
        </p>
      </section>

      {/* ---------- arena ---------- */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,300px)]">
        <AgentPanel side="naive" frames={frames} idx={idx} sourceLabel={`trusts ${NAME[poisoned]} only`} />

        <section className={`px-box ${attackLive ? "danger" : ""} flex flex-col p-4`} aria-label="Price chart">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="px-title">BNB / USD · tick {idx}/{last}</h2>
            <div className="flex items-center gap-2">
              {attackLive && <span className="chip refuse blink">☠ ATTACK ACTIVE</span>}
              {(playing || idx > 0) && <span className="chip sim">SIMULATED</span>}
            </div>
          </div>
          <div className="mt-3 h-[300px] flex-1 lg:h-auto lg:min-h-[340px]">
            <PriceChart frames={frames} idx={idx} poisoned={poisoned} attackRange={attackRange} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-lg">
            <Legend color="var(--white)" dashed label="TRUE" />
            <Legend color={poisoned === "cmc" && attackRange ? "var(--red)" : "var(--green)"} label="CMC" />
            <Legend color={poisoned === "atlas" && attackRange ? "var(--red)" : "var(--cyan)"} label="ATLAS" />
            <span className="text-muted">● red = naive trade · ● green = guarded trade</span>
          </div>
          <input
            type="range"
            min={0}
            max={last}
            value={idx}
            onChange={(e) => {
              setPlaying(false);
              setIdx(Number(e.target.value));
            }}
            aria-label="Scrub ticks"
            className="mt-3 w-full accent-[var(--green)]"
          />
        </section>

        <AgentPanel side="guarded" frames={frames} idx={idx} sourceLabel="cross-checks CMC × Atlas" />
      </div>

      {/* ---------- result banner ---------- */}
      {done && (
        <section className={`px-box ${saved > 1 ? "hot" : ""} mt-6 p-5 text-center`} aria-live="polite">
          <div className="font-pixel text-green text-sm sm:text-lg">GAME OVER</div>
          <p className="mt-3 text-2xl">
            Naive <span className={frame.naive.pnlUsd < 0 ? "text-red" : "text-green"}>{fmtUsd(frame.naive.pnlUsd)}</span> · Guarded{" "}
            <span className={frame.guarded.pnlUsd < 0 ? "text-red" : "text-green"}>{fmtUsd(frame.guarded.pnlUsd)}</span>
          </p>
          <p className="font-pixel text-amber mt-3 text-[10px] sm:text-xs">
            {saved > 1 ? `TRUST LAYER SAVED ${fmtUsd(saved).replace("+", "")} ON $${STRATEGY.startUsd.toLocaleString()}` : "CLEAN DATA → SAME BEHAVIOUR"}
          </p>
        </section>
      )}

      {/* ---------- verdict + proof ---------- */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <VerdictPanel frame={frame} />
        <ProofPanel data={live} loading={liveLoading} error={liveError} onRefresh={fetchLive} />
      </div>

      <footer className="text-muted mt-10 text-center text-lg">
        Read-only demo · no real trades · not financial advice · numbers come from code, never from an LLM
      </footer>
    </main>
  );
}

function fmtUsd(v: number) {
  return `${v >= 0 ? "+" : "-"}$${Math.abs(v).toFixed(0)}`;
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="inline-block h-[4px] w-6" style={{ background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 10px)` : color }} />
      {label}
    </span>
  );
}
