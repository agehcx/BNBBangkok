// SERVER-ONLY. PriceSource adapters: CmcSource, AtlasSource, MockSource.
// Real sources activate automatically when their env vars are set; otherwise MockSource fills in.
import "server-only";
import { SIM_CONFIG, type SymbolId } from "../config";

export interface SourceResult {
  price: number;
  ts: number; // unix seconds of the price itself
  mode: "live" | "mock";
  meta: Record<string, string | number | undefined>;
  error?: string;
}

export interface PriceSource {
  id: "cmc" | "atlas" | "mock";
  fetch(symbol: SymbolId): Promise<SourceResult>;
}

const nowSec = () => Math.floor(Date.now() / 1000);

// ---------------------------------------------------------------- Mock
export const MockSource = (id: "cmc" | "atlas"): PriceSource => ({
  id: "mock",
  async fetch() {
    const wobble = id === "cmc" ? 1.0003 : 0.9998;
    return { price: SIM_CONFIG.fallbackBaseline * wobble, ts: nowSec(), mode: "mock", meta: {} };
  },
});

// ---------------------------------------------------------------- CoinMarketCap
// UNVERIFIED (see spec §5.3): header X-CMC_PRO_API_KEY, endpoint /v2/cryptocurrency/quotes/latest.
// Confirm against https://coinmarketcap.com/api/documentation/ before the demo.
export const CmcSource: PriceSource = {
  id: "cmc",
  async fetch(symbol) {
    const key = process.env.CMC_API_KEY;
    if (!key) return MockSource("cmc").fetch(symbol);
    const base = process.env.CMC_BASE_URL ?? "https://pro-api.coinmarketcap.com";
    try {
      const res = await fetch(`${base}/v2/cryptocurrency/quotes/latest?symbol=${symbol}&convert=USD`, {
        headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.status?.error_message ?? `HTTP ${res.status}`);
      const entry = Array.isArray(json.data?.[symbol]) ? json.data[symbol][0] : json.data?.[symbol];
      const usd = entry?.quote?.USD;
      if (typeof usd?.price !== "number") throw new Error("unexpected CMC payload");
      console.log(`[cmc] ${symbol} ok status.timestamp=${json.status?.timestamp} credits=${json.status?.credit_count}`);
      return {
        price: usd.price,
        ts: Math.floor(new Date(usd.last_updated).getTime() / 1000),
        mode: "live",
        meta: { requestTs: json.status?.timestamp, creditCount: json.status?.credit_count },
      };
    } catch (e) {
      const fallback = await MockSource("cmc").fetch(symbol);
      return { ...fallback, error: (e as Error).message };
    }
  },
};

// ---------------------------------------------------------------- Atlas (on-chain, Chainlink-compatible)
// Reads latestRoundData() + decimals() via raw JSON-RPC eth_call on BSC. Feed address TBD (spec §5.1).
const SEL = { latestRoundData: "0xfeaf968c", decimals: "0x313ce567" };

async function rpc(url: string, method: string, params: unknown[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result as string;
}

const word = (hex: string, i: number) => BigInt("0x" + hex.slice(2 + i * 64, 2 + (i + 1) * 64));
const ONE = BigInt(1);
const toSigned = (v: bigint) => (v >= ONE << BigInt(255) ? v - (ONE << BigInt(256)) : v);

export const AtlasSource: PriceSource = {
  id: "atlas",
  async fetch(symbol) {
    const address = process.env[`ATLAS_FEED_ADDRESS_${symbol}`];
    const url = process.env.BSC_RPC_URL ?? "https://bsc-dataseed.bnbchain.org";
    if (!address) return MockSource("atlas").fetch(symbol);
    try {
      const [blockHex, decHex, roundHex] = await Promise.all([
        rpc(url, "eth_blockNumber", []),
        rpc(url, "eth_call", [{ to: address, data: SEL.decimals }, "latest"]),
        rpc(url, "eth_call", [{ to: address, data: SEL.latestRoundData }, "latest"]),
      ]);
      const decimals = Number(BigInt(decHex));
      const answer = toSigned(word(roundHex, 1));
      const updatedAt = Number(word(roundHex, 3));
      const block = Number(BigInt(blockHex));
      console.log(`[atlas] ${symbol} ok block=${block} address=${address}`);
      return {
        price: Number(answer) / 10 ** decimals,
        ts: updatedAt,
        mode: "live",
        meta: { block, address, updatedAt },
      };
    } catch (e) {
      const fallback = await MockSource("atlas").fetch(symbol);
      return { ...fallback, error: (e as Error).message, meta: { address } };
    }
  },
};
