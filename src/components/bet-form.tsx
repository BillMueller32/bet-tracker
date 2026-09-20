"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  BET_TYPES,
  BET_TYPES_BY_SPORT,
  MULTI_LEG_BET_TYPES,
  SPORTS,
  STATUSES,
  TEASER_POINT_OPTIONS,
  type Bet,
  type BetLeg,
} from "@/lib/bets/constants";
import { GamePicker } from "@/components/game-picker";
import type { EspnEvent } from "@/lib/sports/espn";

const EMPTY_LEG: BetLeg = {
  sport: "",
  event_name: "",
  participant: null,
  selection: "",
  line: null,
  odds: null,
};

type BetFormProps = {
  // Native form action (create/edit pages): submitting navigates/redirects
  // server-side, per Next.js's normal server action behavior.
  action?: (formData: FormData) => void;
  // Client-controlled submit (screenshot review queue): submitting stays
  // on the page so the caller can advance to the next item itself.
  onSubmit?: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaultValues?: Partial<Bet>;
  showStatus?: boolean;
  children?: React.ReactNode;
  // For the onSubmit (client-controlled) path, where native form pending
  // state isn't tracked automatically — the caller owns this state.
  submitting?: boolean;
};

const inputClass =
  "w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-3 text-base text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400";
const labelClass = "mb-1 block text-xs font-medium text-neutral-400";

function SubmitButton({
  label,
  pendingOverride,
}: {
  label: string;
  pendingOverride?: boolean;
}) {
  const { pending: formPending } = useFormStatus();
  const pending = pendingOverride ?? formPending;
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-neutral-100 px-3 py-3 text-base font-medium text-neutral-900 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function BetForm({
  action,
  onSubmit,
  submitLabel,
  defaultValues,
  showStatus,
  children,
  submitting,
}: BetFormProps) {
  const [sport, setSport] = useState(defaultValues?.sport ?? "");
  const [betType, setBetType] = useState(defaultValues?.bet_type ?? "");
  const [legs, setLegs] = useState<BetLeg[]>(defaultValues?.bet_legs ?? []);
  const [eventName, setEventName] = useState(defaultValues?.event_name ?? "");
  const [eventStart, setEventStart] = useState(
    defaultValues?.event_start ?? null,
  );
  const [externalEventId, setExternalEventId] = useState(
    defaultValues?.external_event_id ?? null,
  );

  function selectGame(event: EspnEvent) {
    setEventStart(event.date);
    setExternalEventId(event.id);
    if (!eventName.trim()) setEventName(event.shortName || event.name);
  }

  function clearGame() {
    setEventStart(null);
    setExternalEventId(null);
  }

  function selectLegGame(index: number, event: EspnEvent) {
    updateLeg(index, {
      event_start: event.date,
      external_event_id: event.id,
      ...(legs[index]?.event_name?.trim()
        ? {}
        : { event_name: event.shortName || event.name }),
    });
  }

  function clearLegGame(index: number) {
    updateLeg(index, { event_start: null, external_event_id: null });
  }

  const availableBetTypes = sport
    ? BET_TYPES_BY_SPORT[sport as keyof typeof BET_TYPES_BY_SPORT]
    : BET_TYPES.map((t) => t.value);

  const isMultiLeg = (MULTI_LEG_BET_TYPES as readonly string[]).includes(
    betType,
  );

  function handleBetTypeChange(value: string) {
    setBetType(value);
    if (
      (MULTI_LEG_BET_TYPES as readonly string[]).includes(value) &&
      legs.length === 0
    ) {
      setLegs([{ ...EMPTY_LEG }, { ...EMPTY_LEG }]);
    }
  }

  function updateLeg(index: number, patch: Partial<BetLeg>) {
    setLegs((prev) =>
      prev.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)),
    );
  }

  function removeLeg(index: number) {
    setLegs((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form
      {...(onSubmit
        ? {
            onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              onSubmit(new FormData(e.currentTarget));
            },
          }
        : { action })}
      className="space-y-4"
    >
      <div>
        <label className={labelClass} htmlFor="sport">
          Sport
        </label>
        <select
          id="sport"
          name="sport"
          required
          value={sport}
          onChange={(e) => {
            setSport(e.target.value);
            setBetType("");
          }}
          className={inputClass}
        >
          <option value="" disabled>
            Select a sport
          </option>
          {SPORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="event_name">
          Event
        </label>
        <input
          id="event_name"
          name="event_name"
          type="text"
          required
          placeholder="Chiefs @ Bills"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          className={inputClass}
        />
        {!isMultiLeg && (
          <div className="mt-2">
            <input type="hidden" name="event_start" value={eventStart ?? ""} />
            <input
              type="hidden"
              name="external_event_id"
              value={externalEventId ?? ""}
            />
            <GamePicker
              sport={sport}
              eventStart={eventStart}
              externalEventId={externalEventId}
              onSelect={selectGame}
              onClear={clearGame}
            />
          </div>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="bet_type">
          Bet type
        </label>
        <select
          id="bet_type"
          name="bet_type"
          required
          value={betType}
          onChange={(e) => handleBetTypeChange(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            Select a bet type
          </option>
          {BET_TYPES.filter((t) => availableBetTypes.includes(t.value)).map(
            (t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ),
          )}
        </select>
      </div>

      {!isMultiLeg && (
        <div>
          <label className={labelClass} htmlFor="participant">
            Player / team (if applicable)
          </label>
          <input
            id="participant"
            name="participant"
            type="text"
            placeholder="Patrick Mahomes"
            defaultValue={defaultValues?.participant ?? ""}
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="selection">
          {isMultiLeg ? "Overall description" : "Selection"}
        </label>
        <input
          id="selection"
          name="selection"
          type="text"
          required
          placeholder={
            isMultiLeg
              ? "3-Team Teaser, 10pt"
              : "Bills -3.5, Over 48.5, Mahomes Over 275.5 pass yds"
          }
          defaultValue={defaultValues?.selection}
          className={inputClass}
        />
      </div>

      {betType === "teaser" && (
        <div>
          <label className={labelClass} htmlFor="teaser_points">
            Teaser points
          </label>
          <select
            id="teaser_points"
            name="teaser_points"
            required
            defaultValue={defaultValues?.teaser_points ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select points
            </option>
            {TEASER_POINT_OPTIONS.map((points) => (
              <option key={points} value={points}>
                {points}
              </option>
            ))}
          </select>
        </div>
      )}

      {isMultiLeg && (
        <div>
          <input type="hidden" name="leg_count" value={legs.length} />
          <div className="mb-2 flex items-center justify-between">
            <span className={labelClass}>Legs</span>
            <button
              type="button"
              onClick={() => setLegs((prev) => [...prev, { ...EMPTY_LEG }])}
              className="text-xs text-neutral-400 hover:text-neutral-200"
            >
              + Add leg
            </button>
          </div>
          <div className="space-y-3">
            {legs.map((leg, i) => (
              <div
                key={i}
                className="space-y-2 rounded-md border border-neutral-700 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Leg {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeLeg(i)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                <select
                  name={`leg_sport_${i}`}
                  required
                  value={leg.sport}
                  onChange={(e) => updateLeg(i, { sport: e.target.value })}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a sport
                  </option>
                  {SPORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <input
                  name={`leg_event_name_${i}`}
                  type="text"
                  required
                  placeholder="Event, e.g. Chiefs @ Bills"
                  value={leg.event_name}
                  onChange={(e) =>
                    updateLeg(i, { event_name: e.target.value })
                  }
                  className={inputClass}
                />
                <input
                  type="hidden"
                  name={`leg_event_start_${i}`}
                  value={leg.event_start ?? ""}
                />
                <input
                  type="hidden"
                  name={`leg_external_event_id_${i}`}
                  value={leg.external_event_id ?? ""}
                />
                <GamePicker
                  sport={leg.sport}
                  eventStart={leg.event_start ?? null}
                  externalEventId={leg.external_event_id ?? null}
                  onSelect={(event) => selectLegGame(i, event)}
                  onClear={() => clearLegGame(i)}
                />
                <input
                  name={`leg_participant_${i}`}
                  type="text"
                  placeholder="Player / team (if applicable)"
                  value={leg.participant ?? ""}
                  onChange={(e) =>
                    updateLeg(i, { participant: e.target.value })
                  }
                  className={inputClass}
                />
                <input
                  name={`leg_selection_${i}`}
                  type="text"
                  required
                  placeholder="Selection, e.g. Bills -3.5"
                  value={leg.selection}
                  onChange={(e) =>
                    updateLeg(i, { selection: e.target.value })
                  }
                  className={inputClass}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name={`leg_line_${i}`}
                    type="number"
                    step="any"
                    placeholder="Line"
                    value={leg.line ?? ""}
                    onChange={(e) =>
                      updateLeg(i, {
                        line: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className={inputClass}
                  />
                  <input
                    name={`leg_odds_${i}`}
                    type="number"
                    placeholder="Odds (if shown)"
                    value={leg.odds ?? ""}
                    onChange={(e) =>
                      updateLeg(i, {
                        odds: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={isMultiLeg ? "grid grid-cols-2 gap-3" : "grid grid-cols-3 gap-3"}>
        {!isMultiLeg && (
          <div>
            <label className={labelClass} htmlFor="line">
              Line
            </label>
            <input
              id="line"
              name="line"
              type="number"
              step="any"
              placeholder="-3.5"
              defaultValue={defaultValues?.line ?? ""}
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label className={labelClass} htmlFor="odds">
            Odds
          </label>
          <input
            id="odds"
            name="odds"
            type="number"
            required
            placeholder="-110"
            defaultValue={defaultValues?.odds}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="stake">
            Stake ($)
          </label>
          <input
            id="stake"
            name="stake"
            type="number"
            step="0.01"
            required
            placeholder="50"
            defaultValue={defaultValues?.stake}
            className={inputClass}
          />
        </div>
      </div>

      {showStatus && (
        <div>
          <label className={labelClass} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "pending"}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={defaultValues?.notes ?? ""}
          className={inputClass}
        />
      </div>

      <SubmitButton label={submitLabel} pendingOverride={submitting} />
      {children}
    </form>
  );
}
