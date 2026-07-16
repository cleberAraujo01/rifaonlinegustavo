import { NextResponse } from "next/server";
import { getGridStateSafe } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getGridStateSafe();
  return NextResponse.json(state, {
    headers: { "cache-control": "no-store" },
  });
}
