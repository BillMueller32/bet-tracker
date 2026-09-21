import { createClient } from "@/lib/supabase/server";
import { updateUserSettings } from "@/app/settings/actions";

const inputClass =
  "w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-3 text-base text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400";
const labelClass = "mb-1 block text-xs font-medium text-neutral-400";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = user
    ? await supabase
        .from("user_settings")
        .select("bankroll, unit_size")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-lg font-semibold text-neutral-100">Settings</h1>

      <form action={updateUserSettings} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="bankroll">
            Bankroll ($)
          </label>
          <input
            id="bankroll"
            name="bankroll"
            type="number"
            step="0.01"
            placeholder="1000"
            defaultValue={settings?.bankroll ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Used to show open exposure as a share of your bankroll. Optional.
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="unit_size">
            Unit size ($)
          </label>
          <input
            id="unit_size"
            name="unit_size"
            type="number"
            step="0.01"
            placeholder="25"
            defaultValue={settings?.unit_size ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Your standard bet size, for reference. Optional.
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-100 px-3 py-3 text-base font-medium text-neutral-900"
        >
          Save
        </button>
      </form>
    </div>
  );
}
