import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n/config";
import { getAvailability } from "@/server/booking";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";
  const party = Number(searchParams.get("party") ?? "2");
  const lang = searchParams.get("lang");
  const result = await getAvailability(date, party, isLocale(lang) ? lang : "it");
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
