"use client";

import { useState } from "react";
import { searchGames } from "@/app/bets/actions";
import { sportSupportsGameSearch, type EspnEvent } from "@/lib/sports/espn";

type GamePickerProps = {
  sport: string;
  eventStart: string | null;
  externalEventId: string | null;
  onSelect: (event: EspnEvent) => void;
  onClear: () => void;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateISO: string, days: number) {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function GamePicker({
  sport,
  eventStart,
  externalEventId,
  onSelect,
  onClear,
}: GamePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [results, setResults] = useState<EspnEvent[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!sport || !sportSupportsGameSearch(sport)) {
    return null;
  }

  async function runSearch(searchDate: string) {
    setStatus("loading");
    setErrorMessage("");
    try {
      const events = await searchGames(sport, searchDate);
      setResults(events);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setErrorMessage(
        e instanceof Error ? e.message : "Couldn't search for games.",
      );
    }
  }

  function openPicker() {
    setIsOpen(true);
    runSearch(date);
  }

  function changeDate(newDate: string) {
    setDate(newDate);
    runSearch(newDate);
  }

  if (externalEventId && !isOpen) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm">
        <span className="text-neutral-200">
          Linked to a game
          {eventStart &&
            ` — ${new Date(eventStart).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}`}
        </span>
        <button
          type="button"
          onClick={openPicker}
          className="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-300 hover:text-neutral-100"
        >
          Change
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={openPicker}
        className="rounded-md py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200"
      >
        + Link to a game for live status
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-neutral-700 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => changeDate(shiftDate(date, -1))}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200"
          >
            ← Prev
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => changeDate(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-100"
          />
          <button
            type="button"
            onClick={() => changeDate(shiftDate(date, 1))}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200"
          >
            Next →
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            if (externalEventId) onClear();
          }}
          className="rounded-md px-2 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-300"
        >
          {externalEventId ? "Unlink" : "Cancel"}
        </button>
      </div>

      {status === "loading" && (
        <p className="text-xs text-neutral-400">Loading games...</p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}
      {status === "idle" && results.length === 0 && (
        <p className="text-xs text-neutral-400">No games found for this date.</p>
      )}

      <div className="max-h-48 space-y-1 overflow-y-auto">
        {results.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => {
              onSelect(event);
              setIsOpen(false);
            }}
            className="block w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-left text-sm text-neutral-200 hover:border-neutral-600"
          >
            {event.shortName || event.name}
            <span className="ml-2 text-neutral-400">
              {new Date(event.date).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
