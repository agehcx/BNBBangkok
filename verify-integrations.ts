// Run: cd web && CMC_PRO_API_KEY=... ATLAS_ORACLE_ADDRESS=0x... npm run verify
import { createPublicClient, http, parseAbi } from "viem";
import { bscTestnet } from "viem/chains";

const RPC = "https://data-seed-prebsc-1-s1.binance.org:8545/";

async function testCoinMarketCap(): Promise<void> {
  console.log("--- CoinMarketCap Pro API ---");
  const key = process.env.CMC_PRO_API_KEY;
  if (!key) return console.warn("CMC_PRO_API_KEY not set; skipping");
  const res = await fetch("https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BNB", {
    headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" },
  });
  const json = (await res.json()) as { data?: { BNB: { quote: { USD: { price: number; percent_change_24h: number } } } }; status?: { error_message?: string } };
  if (!res.ok || !json.data) return console.error("CMC error:", json.status?.error_message ?? res.status);
  const usd = json.data.BNB.quote.USD;
  console.log(`OK BNB $${usd.price.toFixed(2)} · 24h ${usd.percent_change_24h}%`);
}

async function testAtlas(): Promise<void> {
  console.log("--- Atlas oracle (BSC Testnet) ---");
  const client = createPublicClient({ chain: bscTestnet, transport: http(RPC) });
  console.log(`OK block ${await client.getBlockNumber()}`);
  const address = process.env.ATLAS_ORACLE_ADDRESS as `0x${string}` | undefined;
  if (!address) return console.warn("ATLAS_ORACLE_ADDRESS not set; skipping read");
  const answer = await client.readContract({ address, abi: parseAbi(["function latestAnswer() view returns (int256)"]), functionName: "latestAnswer" });
  console.log(`OK latestAnswer ${answer}`);
}

async function run(): Promise<void> {
  for (const test of [testCoinMarketCap, testAtlas]) {
    try {
      await test();
    } catch (err) {
      console.error(`${test.name} failed:`, err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  }
}

void run();
