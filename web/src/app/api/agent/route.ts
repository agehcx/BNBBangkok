import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getMarket } from "@/lib/cmc";

export const dynamic = "force-dynamic";

const CLAIM = "Will BNB experience severe volatility (>5% 24h move) or a depeg event within 48h?";
const LOG_FILE = path.join(process.cwd(), "..", "logs", "cournot-verification.json");

type Verdict = { probability: number; evidence: string[]; source: "cournot" | "fallback" };

// COURNOT_API_URL must accept POST {claim} and return {probability: 0..1, evidence: string[]}.
async function queryCournot(claim: string): Promise<Verdict | null> {
  const url = process.env.COURNOT_API_URL;
  const key = process.env.COURNOT_API_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ claim }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Cournot ${res.status}`);
    const j = (await res.json()) as { probability: number; evidence?: string[] };
    return { probability: j.probability, evidence: j.evidence ?? [], source: "cournot" };
  } catch (err) {
    console.error("[agent] Cournot failed, using fallback:", err);
    return null;
  }
}

function fallbackVerdict(volatility: number, liquidityRisk: string): Verdict {
  const probability = Math.min(0.95, 0.1 + volatility * 0.12);
  return {
    probability,
    source: "fallback",
    evidence: [
      `BNB 24h absolute move: ${volatility.toFixed(2)}%`,
      `RWA liquidity risk (CMC volume/market-cap): ${liquidityRisk}`,
      "Cournot credentials not configured; probability estimated from CMC volatility.",
    ],
  };
}

function recommend(p: number): string {
  if (p >= 0.7) return "CIRCUIT_BREAKER: halt deposits, reference price divergence likely.";
  if (p >= 0.4) return "DEFENSIVE: reduce exposure and tighten oracle deviation limits.";
  return "NORMAL: maintain current posture.";
}

export async function GET() {
  const market = await getMarket();
  const verdict = (await queryCournot(CLAIM)) ?? fallbackVerdict(market.volatility, market.liquidityRisk);
  const body = {
    claim: CLAIM,
    probability: verdict.probability,
    evidence: verdict.evidence,
    recommendation: recommend(verdict.probability),
    source: verdict.source,
    requestId: randomUUID(),
    timestamp: Date.now(),
  };

  // Sanitized audit log (no keys, no raw upstream payloads). Read-only filesystems just skip it.
  try {
    await mkdir(path.dirname(LOG_FILE), { recursive: true });
    const { requestId, claim, probability, source, timestamp } = body;
    await appendFile(LOG_FILE, JSON.stringify({ requestId, claim, probability, source, timestamp }) + "\n");
  } catch {
    console.warn("[agent] could not persist verification log");
  }
  console.log("[agent] verified", body.requestId, body.probability, body.source);
  return NextResponse.json(body);
}
