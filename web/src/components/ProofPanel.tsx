"use client";
import type { PriceResponse } from "@/lib/types";

const time = (s?: number) => (s ? new Date(s * 1000).toISOString().replace("T", " ").slice(0, 19) + "Z" : "—");

export function ProofPanel({ data, loading, error, onRefresh }: { data: PriceResponse | null; loading: boolean; error: string | null; onRefresh: () => void }) {
  const cmc = data?.proof.cmc;
  const atlas = data?.proof.atlas;
  return (
    <section className="px-box p-4" aria-label="Data proof">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="px-title">Proof of data</h2>
        <button className="px-btn ghost" onClick={onRefresh} disabled={loading}>
          {loading ? "FETCHING…" : "↻ RE-FETCH"}
        </button>
      </div>

      {error && <p className="text-red mt-3">/api/price failed: {error}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="bg-panel-2 p-3">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-green text-[10px]">COINMARKETCAP</span>
            <ModeChip mode={cmc?.mode} />
          </div>
          <Row k="price" v={data ? `$${data.cmcPrice.toFixed(4)}` : "—"} />
          <Row k="last_updated" v={time(cmc?.ts)} />
          <Row k="status.timestamp" v={cmc?.requestTs ?? "—"} />
          <Row k="credits" v={cmc?.creditCount?.toString() ?? "—"} />
          {cmc?.error && <Row k="error" v={cmc.error} tone="text-red" />}
        </div>

        <div className="bg-panel-2 p-3">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-cyan text-[10px]">ATLAS · BSC</span>
            <ModeChip mode={atlas?.mode} />
          </div>
          <Row k="price" v={data ? `$${data.atlasPrice.toFixed(4)}` : "—"} />
          <Row
            k="feed"
            v={
              atlas?.address ? (
                <a className="text-cyan underline" href={`https://bscscan.com/address/${atlas.address}`} target="_blank" rel="noreferrer">
                  {atlas.address.slice(0, 8)}…{atlas.address.slice(-6)}
                </a>
              ) : (
                "not configured"
              )
            }
          />
          <Row
            k="block"
            v={
              atlas?.block ? (
                <a className="text-cyan underline" href={`https://bscscan.com/block/${atlas.block}`} target="_blank" rel="noreferrer">
                  #{atlas.block}
                </a>
              ) : (
                "—"
              )
            }
          />
          <Row k="updatedAt" v={time(atlas?.updatedAt)} />
          {atlas?.error && <Row k="error" v={atlas.error} tone="text-red" />}
        </div>
      </div>

      <p className="text-muted mt-4 text-lg leading-tight">
        <span className="chip mock mr-2">NOTE</span>
        Values above come from <b className="text-ink">/api/price</b> (server-side; keys never reach the browser). The arena ticks are{" "}
        <span className="text-amber">SIMULATED</span> on top of this baseline snapshot.
        {data && ` Live snapshot verdict: ${data.verdict.toUpperCase()} (gap ${data.gapPct.toFixed(2)}%).`}
      </p>
    </section>
  );
}

function ModeChip({ mode }: { mode?: "live" | "mock" }) {
  if (!mode) return <span className="chip mock">…</span>;
  return mode === "live" ? <span className="chip trust">● LIVE</span> : <span className="chip mock">MOCK</span>;
}

function Row({ k, v, tone }: { k: string; v: React.ReactNode; tone?: string }) {
  return (
    <div className="mt-1 flex justify-between gap-3 text-lg leading-tight">
      <span className="text-muted shrink-0">{k}</span>
      <span className={`min-w-0 truncate text-right ${tone ?? ""}`}>{v}</span>
    </div>
  );
}
