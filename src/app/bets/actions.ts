"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extractBetFromImage } from "@/lib/bets/extract";

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
    ...(getString("status") ? { status: getString("status") } : {}),
    ...(getString("screenshot_path")
      ? { screenshot_path: getString("screenshot_path") }
      : {}),
  };
}

export async function createBet(formData: FormData) {
  const supabase = await createClient();
  const payload = parseBetForm(formData);

  const { error } = await supabase.from("bets").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/bets");
  redirect("/bets");
}

export async function updateBet(id: string, formData: FormData) {
  const supabase = await createClient();
  const payload = parseBetForm(formData);

  const { error } = await supabase.from("bets").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

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

// Uploads one screenshot and reads its bet details, without saving a bet
// yet — used by the screenshot review queue so the user can confirm/edit
// each extracted bet before it's created.
export async function uploadAndExtractBet(formData: FormData) {
  const file = formData.get("screenshot") as File;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const buffer = Buffer.from(await file.arrayBuffer());

  const path = `${user.id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("bet-screenshots")
    .upload(path, buffer, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const extracted = await extractBetFromImage(
    buffer.toString("base64"),
    file.type,
  );

  return { screenshotPath: path, extracted };
}

// Same as createBet, but doesn't redirect — the screenshot review queue
// calls this once per confirmed bet and advances to the next one itself.
export async function createBetFromReview(formData: FormData) {
  const supabase = await createClient();
  const payload = parseBetForm(formData);

  const { error } = await supabase.from("bets").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/bets");
}
