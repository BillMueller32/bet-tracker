"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
