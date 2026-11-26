import { NextResponse } from "next/server";
import { ASSET_CLASS, SYMBOLS, type SymbolId } from "@/lib/config";
import { AtlasSource, CmcSource } from "@/lib/sources";
import { evaluateTrust } from "@/lib/trust";
import type { PriceResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const symbol = (new URL(req.url).searchParams.get("symbol") ?? "BNB").toUpperCase();
  if (!SYMBOLS.includes(symbol as SymbolId)) {
    return NextResponse.json({ error: `unsupported symbol; use one of ${SYMBOLS.join(",")}` }, { status: 400 });
  }
  const sym = symbol as SymbolId;
  const [cmc, atlas] = await Promise.all([CmcSource.fetch(sym), AtlasSource.fetch(sym)]);
  const now = Math.floor(Date.now() / 1000);
  const trust = evaluateTrust({ cmc, atlas, now, assetClass: ASSET_CLASS[sym] });

  const body: PriceResponse = {
    symbol: sym,
    cmcPrice: cmc.price,
    atlasPrice: atlas.price,
    gapPct: trust.gapPct,
    verdict: trust.verdict,
    reasons: trust.reasons.map((r) => `${r.code}: ${r.message}`),
    proof: {
      cmc: {
        mode: cmc.mode,
        ts: cmc.ts,
        requestTs: cmc.meta.requestTs as string | undefined,
        creditCount: cmc.meta.creditCount as number | undefined,
        error: cmc.error,
      },
      atlas: {
        mode: atlas.mode,
        source: atlas.mode === "live" ? "onchain" : "mock",
        block: atlas.meta.block as number | undefined,
        address: atlas.meta.address as string | undefined,
        updatedAt: atlas.meta.updatedAt as number | undefined,
        error: atlas.error,
      },
    },
    fetchedAt: now,
  };
  return NextResponse.json(body);
}
