import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Bet } from "@/lib/bets/constants";
import { betsToCsv } from "@/lib/bets/csv";
import { localDayKey } from "@/lib/bets/time";

// Exports every bet, ignoring whatever filters are active on the
// Analytics page — this is meant as a full backup/spreadsheet dump, not
// a "download what I'm looking at" for a filtered view.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: bets, error } = await supabase
    .from("bets")
    .select("*, bet_legs(*)")
    .order("placed_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const csv = betsToCsv((bets ?? []) as Bet[]);
  const filename = `bets-${localDayKey(new Date().toISOString())}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
