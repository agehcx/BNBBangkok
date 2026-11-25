import { NextResponse } from "next/server";
import { getMarket } from "@/lib/cmc";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getMarket());
}
