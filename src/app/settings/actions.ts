"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateUserSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You're signed out — refresh the page and sign in again.");

  const getNumber = (key: string) => {
    const raw = (formData.get(key) as string | null)?.trim();
    return raw ? Number(raw) : null;
  };

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    bankroll: getNumber("bankroll"),
    unit_size: getNumber("unit_size"),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings");
}
