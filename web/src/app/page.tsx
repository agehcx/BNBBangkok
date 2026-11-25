"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bot, Database, Gauge, Vault } from "lucide-react";
import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
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

function Card({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-card p-5 ${className}`}>
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

const btn = "rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-primary disabled:opacity-40";
const usd = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export default function Home() {
  const { address } = useAccount();
  const qc = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("0.01");
  const [bump, setBump] = useState(0);
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

  const m = market.data;
  const a = agent.data;
  const cmcGap = m && atlasPrice ? ((m.paxg.price - atlasPrice) / atlasPrice) * 100 : undefined;

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Aura // BNB RWA Engine</h1>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-success/40 px-3 py-1 text-xs text-success">BSC Testnet · 97</span>
          <ConnectButton showBalance={false} />
        </div>
      </header>

      {!VAULT && <p className="rounded-lg border border-warn/50 p-3 text-sm text-warn">Set NEXT_PUBLIC_VAULT_ADDRESS in web/.env.local to enable on-chain features.</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="On-Chain Oracle (Atlas)" icon={<Database size={14} />}>
          <p className="text-3xl font-semibold">{atlasPrice ? usd(atlasPrice) : "—"}</p>
          <p className={`mt-1 text-sm ${ageSec !== undefined && ageSec > 3600 ? "text-warn" : "text-success"}`}>
            {ageSec === undefined ? "no data" : ageSec > 3600 ? `STALE · ${ageSec}s old` : `Fresh · ${ageSec}s old`}
          </p>
          {ATLAS && (
            <a className="mt-2 inline-block text-xs text-primary underline" href={`${EXPLORER}/address/${ATLAS}`} target="_blank" rel="noreferrer">
              View feed on BscScan
            </a>
          )}
        </Card>

        <Card title="Market Intelligence (CMC)" icon={<Activity size={14} />}>
          {m ? (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>PAXG (CMC)</dt><dd>{usd(m.paxg.price)}</dd></div>
              <div className="flex justify-between"><dt>vs Atlas</dt><dd>{cmcGap === undefined ? "—" : `${cmcGap.toFixed(2)}%`}</dd></div>
              <div className="flex justify-between"><dt>BNB 24h vol</dt><dd>{usd(m.bnb.volume24h)}</dd></div>
              <div className="flex justify-between"><dt>Volatility</dt><dd>{m.volatility.toFixed(2)}%</dd></div>
              <div className="flex justify-between"><dt>Liquidity risk</dt><dd className={m.liquidityRisk === "HIGH" ? "text-warn" : "text-success"}>{m.liquidityRisk}</dd></div>
              <p className="pt-1 text-xs text-white/40">source: {m.source}</p>
            </dl>
          ) : <p className="text-sm text-white/50">Loading…</p>}
        </Card>

        <Card title="Vault Terminal" icon={<Vault size={14} />}>
          <p className="text-sm">Status: <span className={statusLabel === "NORMAL" ? "text-success" : "text-warn"}>{statusLabel}</span></p>
          <p className="text-sm">Your shares: {shares.data !== undefined ? formatEther(shares.data) : "—"}</p>
          <div className="mt-3 flex gap-2">
            <input aria-label="Deposit amount in BNB" className="w-24 rounded-lg border border-line bg-bg px-2 py-1 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button className={btn} disabled={!VAULT || !address} onClick={deposit}>Deposit BNB</button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="AI Agent · Cournot Oracle" icon={<Bot size={14} />}>
          {a ? (
            <div className="space-y-2 text-sm">
              <p className="text-white/70">{a.claim}</p>
              <div className="h-2 rounded bg-line"><div className="h-2 rounded bg-purple" style={{ width: `${a.probability * 100}%` }} /></div>
              <p className="font-semibold">{(a.probability * 100).toFixed(1)}% <span className="text-xs font-normal text-white/40">({a.source})</span></p>
              <ul className="list-disc pl-5 text-white/70">{a.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
              <p className="text-primary">{a.recommendation}</p>
            </div>
          ) : <p className="text-sm text-white/50">Run “Query Cournot Probability” to evaluate the claim.</p>}
        </Card>

        <Card title="Demo Controller" icon={<Gauge size={14} />}>
          <div className="flex flex-col gap-2">
            <button className={btn} onClick={() => { setBump(DEVIATION_PCT); log(`simulated reference deviation +${DEVIATION_PCT}%`); }}>
              Simulate Oracle Deviation (+{DEVIATION_PCT}%)
            </button>
            <button className={btn} onClick={queryCournot}>Query Cournot Probability</button>
            <button className={`${btn} border-warn/60 text-warn`} disabled={!VAULT || !address} onClick={circuitBreaker}>
              Execute On-Chain Circuit Breaker
            </button>
            <p className="text-xs text-white/40">Active deviation: +{bump}% (on-chain threshold 3%)</p>
          </div>
        </Card>
      </div>

      <Card title="Activity Terminal" icon={<Activity size={14} />}>
        <pre className="h-40 overflow-auto whitespace-pre-wrap font-mono text-xs text-success" aria-live="polite">
          {logs.length ? logs.join("\n") : "waiting for activity…"}
        </pre>
      </Card>
    </main>
  );
}
