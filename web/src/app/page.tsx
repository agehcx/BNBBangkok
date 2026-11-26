"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bot, Database, Gauge, LayoutGrid, Menu, Search, ShieldAlert, Vault } from "lucide-react";
import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { PixelBg } from "@/components/PixelBg";
import { ATLAS, EXPLORER, FEED_ID, ORACLE_DECIMALS, VAULT, vaultAbi } from "@/config/wagmi";

const STATUS = ["NORMAL", "DEFENSIVE", "CIRCUIT_BROKEN"] as const;
const REFRESH_MS = 15_000;
const DEVIATION_PCT = 3.5;

interface Market {
  source: string;
  bnb: { price: number; change24h: number; volume24h: number };
  paxg: { price: number; change24h: number; volume24h: number };
  volatility: number;
  liquidityRisk: "LOW" | "MEDIUM" | "HIGH";
}
interface Agent {
  claim: string;
  probability: number;
  evidence: string[];
  recommendation: string;
  source: string;
  requestId: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json() as Promise<T>;
}

const usd = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });
const caps = "font-pixel font-bold uppercase tracking-[0.2em]";
const btnGold = `${caps} transition-colors active:translate-y-px bg-accent px-4 py-3 text-xs text-bg hover:bg-white disabled:cursor-not-allowed disabled:bg-line disabled:text-ink/80 disabled:hover:bg-line`;
const btnLine = `${caps} transition-colors active:translate-y-px border-2 border-accent px-4 py-3 text-left text-xs text-accent hover:bg-accent hover:text-bg disabled:cursor-not-allowed disabled:border-line disabled:text-ink/70 disabled:hover:bg-transparent disabled:hover:text-ink/70`;

function Tile({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "sun" }) {
  return <span className={`grid h-9 w-9 place-items-center transition-transform duration-200 ${tone === "sun" ? "bg-white text-bg group-hover:translate-y-1" : "bg-accent text-bg group-hover:-translate-y-1"}`}>{children}</span>;
}

const ORDER: Record<string, number> = { oracle: 0, market: 1, vault: 2, demo: 3, activity: 4 };

function Card({ id, title, icon, children, hidden = false }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <section id={id} style={{ animationDelay: `${(ORDER[id] ?? 0) * 70}ms` }} className="rise lift border border-line bg-card p-5">
      <h2 className={`${caps} mb-4 flex items-center gap-2 text-[11px] text-accent`}>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ k, v, tone }: { k: string; v: React.ReactNode; tone?: "gold" | "alert" | "sun" }) {
  return (
    <div className="flex justify-between border-b border-line py-1.5 text-sm last:border-0">
      <dt className="text-ink/70">{k}</dt>
      <dd className={tone === "alert" ? "font-bold text-alert" : tone === "sun" ? "font-bold text-sun" : tone === "gold" ? "font-bold" : ""}>{v}</dd>
    </div>
  );
}

export default function Home() {
  const { address } = useAccount();
  const qc = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("0.01");
  const [bump, setBump] = useState(0);
  const [active, setActive] = useState("overview");
  const [logs, setLogs] = useState<string[]>([]);
  const log = (line: string) => setLogs((l) => [...l.slice(-49), `${new Date().toISOString().slice(11, 19)} ${line}`]);

  const market = useQuery({ queryKey: ["market"], queryFn: () => getJson<Market>("/api/market"), refetchInterval: REFRESH_MS });
  const agent = useQuery({ queryKey: ["agent"], queryFn: () => getJson<Agent>("/api/agent"), enabled: false });

  const oracle = useReadContract({ address: VAULT, abi: vaultAbi, functionName: "oraclePrice", args: [FEED_ID], query: { enabled: !!VAULT, refetchInterval: REFRESH_MS } });
  const status = useReadContract({ address: VAULT, abi: vaultAbi, functionName: "status", query: { enabled: !!VAULT, refetchInterval: REFRESH_MS } });
  const shares = useReadContract({ address: VAULT, abi: vaultAbi, functionName: "shares", args: address ? [address] : undefined, query: { enabled: !!VAULT && !!address } });

  const atlasPrice = oracle.data ? Number(oracle.data[0]) / 10 ** ORACLE_DECIMALS : undefined;
  const ageSec = oracle.data ? Number(oracle.data[1]) : undefined;
  const statusLabel = STATUS[Number(status.data ?? 0)];
  const stale = ageSec !== undefined && ageSec > 3600;

  async function send(label: string, fn: () => Promise<`0x${string}`>) {
    try {
      const hash = await fn();
      log(`${label} tx ${EXPLORER}/tx/${hash}`);
      await Promise.all([status.refetch(), shares.refetch()]);
    } catch (err) {
      log(`${label} failed: ${err instanceof Error ? err.message.split("\n")[0] : "unknown error"}`);
    }
  }

  const deposit = () =>
    send("deposit", () => writeContractAsync({ address: VAULT!, abi: vaultAbi, functionName: "deposit", value: parseEther(amount) }));

  const circuitBreaker = () => {
    if (!atlasPrice || !oracle.data) return log("circuit breaker: Atlas price unavailable");
    // Reference price = Atlas price * (1 + bump); deviation must reach the 3% on-chain threshold.
    const expected = BigInt(Math.round(Number(oracle.data[0]) * (1 + bump / 100)));
    return send("circuit-breaker", () =>
      writeContractAsync({ address: VAULT!, abi: vaultAbi, functionName: "executeRiskAction", args: [FEED_ID, 2, expected] }),
    );
  };

  async function queryCournot() {
    const { data, error } = await agent.refetch();
    if (data) log(JSON.stringify({ requestId: data.requestId, probability: data.probability, source: data.source }));
    else log(`cournot failed: ${error?.message}`);
    qc.invalidateQueries({ queryKey: ["market"] });
  }

  // Sidebar picks which view the main pane shows (like mail folders); no scrolling or URL hash.
  const show = (id: string) => active === "overview" || active === id;

  const m = market.data;
  const a = agent.data;
  const cmcGap = m && atlasPrice ? ((m.paxg.price - atlasPrice) / atlasPrice) * 100 : undefined;

  const nav = [
    { id: "overview", label: "Overview", icon: <LayoutGrid size={16} />, count: "" },
    { id: "oracle", label: "Oracle", icon: <Database size={16} />, count: stale ? "STALE" : atlasPrice ? "LIVE" : "" },
    { id: "market", label: "Market", icon: <Activity size={16} />, count: m?.liquidityRisk ?? "" },
    { id: "vault", label: "Vault", icon: <Vault size={16} />, count: statusLabel === "NORMAL" ? "" : statusLabel },
    { id: "demo", label: "Demo", icon: <Gauge size={16} />, count: "" },
    { id: "activity", label: "Activity", icon: <ShieldAlert size={16} />, count: logs.length ? String(logs.length) : "" },
  ];

  return (
    <div className="relative min-h-screen">
      <PixelBg />

      {/* Top bar */}
      <header className="relative z-10 flex items-center gap-4 px-6 py-4">
        <Menu size={20} className="text-ink/70" aria-hidden />
        <a
          href="/"
          aria-label="Aura home"
          onClick={(e) => {
            e.preventDefault();
            setActive("overview");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="group flex items-center gap-2"
        >
          <Tile><span className="font-pixel text-lg leading-none">A</span></Tile>
          <Tile tone="sun"><span className="font-pixel text-lg leading-none">R</span></Tile>
          <span className="ml-2 font-pixel text-3xl font-bold leading-none tracking-tight transition-colors group-hover:text-accent">AURA</span>
        </a>
        <div className="mx-4 hidden max-w-xl flex-1 items-center gap-3 border border-line bg-panel px-4 py-2.5 md:flex">
          <Search size={16} className="text-ink/60" aria-hidden />
          <span className="truncate text-sm text-ink/60">Feed XAU/USD · {FEED_ID.slice(0, 18)}…</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className={`${caps} hidden border border-accent px-3 py-2 text-[10px] text-accent sm:block`}><span className="pulse-dot mr-2 inline-block h-2 w-2 bg-accent" />BSC Testnet · 97</span>
          <ConnectButton showBalance={false} />
        </div>
      </header>

      <div className="relative z-10 flex gap-4 px-6 pb-10">
        {/* Sidebar */}
        <aside className="sticky top-4 hidden w-56 shrink-0 self-start lg:block">
          <button className={`${btnGold} mb-5 w-full`} disabled={!VAULT || !address} onClick={deposit}>
            + Deposit {amount} BNB
          </button>
          <nav className="space-y-1">
            {nav.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setActive(n.id)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${active === n.id ? "bg-accent font-semibold text-bg" : "text-ink/90 hover:bg-white/10"}`}
              >
                {n.icon}
                <span>{n.label}</span>
                <span className="ml-auto text-[10px] tracking-widest">{n.count}</span>
              </button>
            ))}
          </nav>
          <p className={`${caps} mt-8 px-4 text-[10px] text-ink/60`}>Sources</p>
          <ul className="mt-2 space-y-1 px-4 text-sm text-ink/70">
            <li>CoinMarketCap</li>
            <li>Atlas</li>
            <li>Cournot</li>
          </ul>
        </aside>

        {/* Main pane */}
        <main className="min-w-0 flex-1 space-y-4 border border-line bg-panel p-6">
          <div className="flex items-center gap-4 border-b border-line pb-4 text-xs text-ink/70">
            <span className={`${caps} text-[10px]`}>{nav.find((n) => n.id === active)?.label}</span>
            <span className="ml-auto">{m ? `data: ${m.source}` : "loading…"}</span>
          </div>

          {active === "overview" && (
          <div className="py-4">
            <h1 className="pixel-wipe font-pixel text-5xl uppercase leading-[0.95] tracking-tight sm:text-7xl">
              RWA risk<br />engine
            </h1>
            <p className={`${caps} mt-4 text-sm text-accent`}>Build · Web3 · On BNB Chain</p>
          </div>
          )}

          {!VAULT && (
            <p className="border-2 border-alert bg-card p-3 text-sm font-semibold text-alert">
              Set NEXT_PUBLIC_VAULT_ADDRESS in web/.env.local to enable on-chain features.
            </p>
          )}

          <div key={active} className="space-y-4">
          <div className={`grid gap-4 ${active === "overview" ? "md:grid-cols-2" : ""}`}>
            <Card hidden={!show("oracle")} id="oracle" title="On-chain oracle · Atlas" icon={<Database size={14} />}>
              <p className="font-pixel text-5xl">{atlasPrice ? usd(atlasPrice) : "—"}</p>
              <p className={`mt-2 text-sm ${stale ? "font-bold text-alert" : "font-bold text-ink"}`}>
                {ageSec === undefined ? "no data" : stale ? `STALE · ${ageSec}s old` : `Fresh · ${ageSec}s old`}
              </p>
              {ATLAS && (
                <a className="mt-3 inline-block text-xs font-semibold text-accent underline" href={`${EXPLORER}/address/${ATLAS}`} target="_blank" rel="noreferrer">
                  View feed on BscScan
                </a>
              )}
            </Card>

            <Card hidden={!show("market")} id="market" title="Market intelligence · CMC" icon={<Activity size={14} />}>
              {m ? (
                <dl>
                  <Row k="PAXG (CMC)" v={usd(m.paxg.price)} />
                  <Row k="vs Atlas" v={cmcGap === undefined ? "—" : `${cmcGap.toFixed(2)}%`} />
                  <Row k="BNB 24h volume" v={usd(m.bnb.volume24h)} />
                  <Row k="Volatility" v={`${m.volatility.toFixed(2)}%`} />
                  <Row k="Liquidity risk" v={m.liquidityRisk} tone={m.liquidityRisk === "HIGH" ? "alert" : m.liquidityRisk === "MEDIUM" ? "sun" : "gold"} />
                </dl>
              ) : <p className="text-sm text-ink/70">Loading…</p>}
            </Card>

            <Card hidden={!show("vault")} id="vault" title="Vault terminal" icon={<Vault size={14} />}>
              <dl>
                <Row k="Status" v={statusLabel} tone={statusLabel === "NORMAL" ? "gold" : statusLabel === "DEFENSIVE" ? "sun" : "alert"} />
                <Row k="Your shares" v={shares.data !== undefined ? formatEther(shares.data) : "—"} />
              </dl>
              <div className="mt-4 flex gap-2">
                <input aria-label="Deposit amount in BNB" className="w-28 border-2 border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <button className={btnGold} disabled={!VAULT || !address} onClick={deposit}>Deposit</button>
              </div>
            </Card>

            <Card hidden={!show("demo")} id="demo" title="Demo controller" icon={<Gauge size={14} />}>
              <div className="flex flex-col gap-2">
                <button className={btnLine} onClick={() => { setBump(DEVIATION_PCT); log(`simulated reference deviation +${DEVIATION_PCT}%`); }}>
                  Simulate oracle deviation (+{DEVIATION_PCT}%)
                </button>
                <button className={btnLine} onClick={queryCournot}>Query Cournot probability</button>
                <button className={`${btnLine} !border-alert text-alert`} disabled={!VAULT || !address} onClick={circuitBreaker}>
                  Execute on-chain circuit breaker
                </button>
                <p className="text-xs text-ink/60">Active deviation +{bump}% · on-chain threshold 3%</p>
              </div>
            </Card>
          </div>

          <Card hidden={!show("activity")} id="activity" title="Activity terminal" icon={<ShieldAlert size={14} />}>
            <pre className="h-40 overflow-auto whitespace-pre-wrap font-mono text-xs text-accent" aria-live="polite">
              {logs.length ? logs.join("\n") : "waiting for activity…"}<span className="blink"> ▮</span>
            </pre>
          </Card>
          </div>
        </main>

        {/* Right panel: agent (Gmail's Gemini slot) */}
        <aside className="rise sticky top-4 hidden w-80 shrink-0 self-start border border-line bg-panel p-5 xl:block">
          <h2 className={`${caps} mb-4 flex items-center gap-2 text-[11px] text-accent`}><Bot size={14} /> Cournot agent</h2>
          {a ? (
            <div className="space-y-3 text-sm">
              <p className="text-ink/90">{a.claim}</p>
              <div className="h-2 bg-line"><div className="h-2 bg-accent transition-[width] duration-700" style={{ width: `${a.probability * 100}%` }} /></div>
              <p className="font-pixel text-4xl">{(a.probability * 100).toFixed(1)}%</p>
              <p className="text-[10px] uppercase tracking-widest text-ink/60">source: {a.source}</p>
              <ul className="list-disc space-y-1 pl-5 text-ink/90">{a.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
              <p className="border-t border-line pt-3 font-semibold text-accent">{a.recommendation}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-ink/70">Evaluate the macro-risk claim to get a probability, evidence and recommended posture.</p>
              <button className={`${btnGold} w-full`} onClick={queryCournot}>Query agent</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
