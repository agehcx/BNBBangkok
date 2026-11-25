const CMC_URL = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BNB,PAXG";

export type Asset = { price: number; change24h: number; volume24h: number; marketCap: number };
export type Market = {
  source: "coinmarketcap" | "mock";
  bnb: Asset;
  paxg: Asset;
  /** Absolute 24h % move of BNB, used as the volatility metric. */
  volatility: number;
  liquidityRisk: "LOW" | "MEDIUM" | "HIGH";
  timestamp: number;
};

const MOCK: Pick<Market, "bnb" | "paxg"> = {
  bnb: { price: 612.4, change24h: 1.8, volume24h: 1_900_000_000, marketCap: 89_000_000_000 },
  paxg: { price: 2012.5, change24h: 0.4, volume24h: 160_000_000, marketCap: 800_000_000 },
};

type CmcQuote = { quote: { USD: { price: number; percent_change_24h: number; volume_24h: number; market_cap: number } } };

function toAsset(q: CmcQuote): Asset {
  const u = q.quote.USD;
  return { price: u.price, change24h: u.percent_change_24h, volume24h: u.volume_24h, marketCap: u.market_cap };
}

// Thin turnover (volume / market cap) means a shallow market for the asset.
function liquidityRisk(a: Asset): Market["liquidityRisk"] {
  const turnover = a.marketCap > 0 ? a.volume24h / a.marketCap : 0;
  if (turnover < 0.01) return "HIGH";
  return turnover < 0.03 ? "MEDIUM" : "LOW";
}

function build(source: Market["source"], d: Pick<Market, "bnb" | "paxg">): Market {
  return {
    source,
    ...d,
    volatility: Math.abs(d.bnb.change24h),
    liquidityRisk: liquidityRisk(d.paxg),
    timestamp: Date.now(),
  };
}

/** Server-only. Falls back to mock data when the key is missing or CMC fails. */
export async function getMarket(): Promise<Market> {
  const key = process.env.CMC_PRO_API_KEY;
  if (!key) return build("mock", MOCK);
  try {
    const res = await fetch(CMC_URL, {
      headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`CMC ${res.status}`);
    const json = (await res.json()) as { data: { BNB: CmcQuote; PAXG: CmcQuote } };
    return build("coinmarketcap", { bnb: toAsset(json.data.BNB), paxg: toAsset(json.data.PAXG) });
  } catch (err) {
    console.error("[market] CMC failed, using mock:", err);
    return build("mock", MOCK);
  }
}
