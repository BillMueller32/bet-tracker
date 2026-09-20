"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extractBetFromImage, type ExtractedBet } from "@/lib/bets/extract";
import {
  findBestMatch,
  searchEspnEvents,
  sportSupportsGameSearch,
  type EspnEvent,
} from "@/lib/sports/espn";

const EXTENSION_BY_MEDIA_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function parseBetForm(formData: FormData) {
  const getString = (key: string) =>
    (formData.get(key) as string | null)?.trim() || null;
  const getNumber = (key: string) => {
    const raw = getString(key);
    return raw === null ? null : Number(raw);
  };

  return {
    sport: formData.get("sport") as string,
    event_name: getString("event_name")!,
    bet_type: formData.get("bet_type") as string,
    participant: getString("participant"),
    selection: getString("selection")!,
    line: getNumber("line"),
    odds: getNumber("odds")!,
    stake: getNumber("stake")!,
    notes: getString("notes"),
    teaser_points: getNumber("teaser_points"),
    event_start: getString("event_start"),
    external_event_id: getString("external_event_id"),
    sportsbook: getString("sportsbook"),
    is_free_bet: formData.get("is_free_bet") === "on",
    cash_out_amount: getNumber("cash_out_amount"),
    actual_profit: getNumber("actual_profit"),
    ...(getString("status") ? { status: getString("status") } : {}),
    ...(getString("screenshot_path")
      ? { screenshot_path: getString("screenshot_path") }
      : {}),
  };
}

// Parlay/teaser legs are submitted as indexed fields (leg_sport_0,
// leg_event_name_0, ...) rather than a single value per key, since native
// FormData has no nested/array structure.
function parseLegs(formData: FormData) {
  const legCount = Number(formData.get("leg_count") ?? 0);
  const legs = [];

  for (let i = 0; i < legCount; i++) {
    const getString = (key: string) =>
      (formData.get(`leg_${key}_${i}`) as string | null)?.trim() || null;
    const sport = getString("sport");
    const eventName = getString("event_name");
    const selection = getString("selection");
    if (!sport || !eventName || !selection) continue;

    const line = getString("line");
    const odds = getString("odds");
    legs.push({
      leg_order: i,
      sport,
      event_name: eventName,
      event_start: getString("event_start"),
      external_event_id: getString("external_event_id"),
      participant: getString("participant"),
      selection,
      line: line === null ? null : Number(line),
      odds: odds === null ? null : Number(odds),
    });
  }

  return legs;
}

async function saveLegs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  betId: string,
  legs: ReturnType<typeof parseLegs>,
) {
  const { error: deleteError } = await supabase
    .from("bet_legs")
    .delete()
    .eq("bet_id", betId);
  if (deleteError) throw new Error(deleteError.message);

  if (legs.length === 0) return;

  const { error: insertError } = await supabase
    .from("bet_legs")
    .insert(legs.map((leg) => ({ ...leg, bet_id: betId })));
  if (insertError) throw new Error(insertError.message);
}

export async function createBet(formData: FormData) {
  const supabase = await createClient();
  const payload = parseBetForm(formData);
  const legs = parseLegs(formData);

  const { data, error } = await supabase
    .from("bets")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await saveLegs(supabase, data.id, legs);

  revalidatePath("/bets");
  redirect("/bets");
}

export async function updateBet(id: string, formData: FormData) {
  const supabase = await createClient();
  const payload = parseBetForm(formData);
  const legs = parseLegs(formData);

  const { error } = await supabase.from("bets").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  await saveLegs(supabase, id, legs);

  revalidatePath("/bets");
  redirect("/bets");
}

export async function deleteBet(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("bets").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/bets");
  redirect("/bets");
}

// Auto-links a single sport/date/team-hints combo to a real ESPN game,
// best-effort — a failed or empty match just leaves the bet unlinked so
// the user can search manually instead. Shares a per-request cache so a
// multi-leg bet with several picks on the same date doesn't refetch the
// same day's scoreboard repeatedly.
async function autoLinkGame(
  cache: Map<string, EspnEvent[]>,
  sport: string | undefined,
  eventDate: string | undefined,
  teamHints: (string | undefined)[],
): Promise<{ event_start: string; external_event_id: string } | null> {
  if (!sport || !eventDate || !sportSupportsGameSearch(sport)) return null;

  const cacheKey = `${sport}:${eventDate}`;
  let events = cache.get(cacheKey);
  if (!events) {
    try {
      events = await searchEspnEvents(sport, eventDate);
    } catch {
      events = [];
    }
    cache.set(cacheKey, events);
  }

  const match = findBestMatch(
    events,
    teamHints.filter((h): h is string => !!h),
  );
  return match ? { event_start: match.date, external_event_id: match.id } : null;
}

async function autoLinkExtracted(extracted: ExtractedBet): Promise<void> {
  const cache = new Map<string, EspnEvent[]>();

  // Match on the specific team the bet names (participant), not the
  // full event_name: a hallucinated or two-team event_name string (e.g.
  // "TB Buccaneers @ Pittsburgh Steelers" when the real opponent wasn't
  // actually visible) can substring-match a completely unrelated game
  // and link it with false confidence. event_name is only a fallback
  // for older/manual entries that never got a participant filled in.
  if (extracted.legs && extracted.legs.length > 0) {
    for (const leg of extracted.legs) {
      const match = await autoLinkGame(cache, leg.sport, leg.event_date, [
        leg.participant ?? leg.event_name,
      ]);
      if (match) Object.assign(leg, match);
    }
  } else {
    const match = await autoLinkGame(
      cache,
      extracted.sport,
      extracted.event_date,
      [extracted.participant ?? extracted.event_name],
    );
    if (match) Object.assign(extracted, match);
  }
}

// Uploads one screenshot and reads its bet details, without saving a bet
// yet — used by the screenshot review queue so the user can confirm/edit
// each extracted bet before it's created.
export async function uploadAndExtractBet(formData: FormData) {
  // This action is called directly from client code (not a <form>), so it
  // must never call redirect() — that control-flow signal only works
  // cleanly for form-bound actions and otherwise corrupts the response.
  // It also must only ever throw a plain Error: anything more complex
  // (e.g. an SDK error carrying raw Headers) fails to serialize back to
  // the browser and shows up there as a useless "Minified React error".
  try {
    const file = formData.get("screenshot") as File;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You're signed out — refresh the page and sign in again.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Build a clean storage key instead of reusing the original filename —
    // screenshot filenames (e.g. "Screenshot 2026-09-19 at 3.48.33 PM.png")
    // contain spaces/punctuation that Supabase Storage rejects as an
    // "Invalid key".
    const extension = EXTENSION_BY_MEDIA_TYPE[file.type] ?? "png";
    const path = `${user.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("bet-screenshots")
      .upload(path, buffer, { contentType: file.type });
    if (uploadError) throw new Error(uploadError.message);

    const extracted = await extractBetFromImage(
      buffer.toString("base64"),
      file.type,
    );

    // Best-effort: a failure here shouldn't fail the whole screenshot
    // upload, since the bet is still perfectly usable unlinked.
    try {
      await autoLinkExtracted(extracted);
    } catch {
      // ignore — user can still link manually in the review step
    }

    return { screenshotPath: path, extracted };
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : "Something went wrong reading this screenshot.",
    );
  }
}

// Same as createBet, but doesn't redirect — the screenshot review queue
// calls this once per confirmed bet and advances to the next one itself.
export async function createBetFromReview(formData: FormData) {
  const supabase = await createClient();
  const payload = parseBetForm(formData);
  const legs = parseLegs(formData);

  const { data, error } = await supabase
    .from("bets")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await saveLegs(supabase, data.id, legs);

  revalidatePath("/bets");
}

// Called directly from the GamePicker client component (not a <form>), so
// same rule as uploadAndExtractBet: only ever throw a plain Error.
export async function searchGames(sport: string, date: string) {
  try {
    return await searchEspnEvents(sport, date);
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : "Couldn't search for games.",
    );
  }
}
