import type { Bet } from "@/lib/bets/constants";
import { searchEspnEvents, type EspnEvent } from "./espn";

export type LiveStatusRequest = {
  sport: string;
  eventDate: string; // YYYY-MM-DD, sliced from the stored event_start
  externalEventId: string;
};

const ACTIVE_STATUSES = new Set(["pending", "live"]);

// One source of truth for "which linked games does this set of bets need
// a live status for" — every page that grades or displays live bets
// (Dashboard, Analytics, Bets) builds its lookup the same way.
//
// eventDate is sliced from event_start (ESPN's own UTC start timestamp),
// not the local day — it's the date bucket ESPN's own scoreboard groups
// the game under, which may not be Eastern or Pacific. Unverified which
// one; if evening games stop finding live status, that's the place to
// look next.
export function collectLiveStatusRequests(bets: Bet[]): LiveStatusRequest[] {
  const requests: LiveStatusRequest[] = [];

  for (const bet of bets) {
    if (!ACTIVE_STATUSES.has(bet.status)) continue;

    const legs = bet.bet_legs ?? [];
    if (legs.length > 0) {
      for (const leg of legs) {
        if (leg.external_event_id && leg.event_start) {
          requests.push({
            sport: leg.sport,
            eventDate: leg.event_start.slice(0, 10),
            externalEventId: leg.external_event_id,
          });
        }
      }
    } else if (bet.external_event_id && bet.event_start) {
      requests.push({
        sport: bet.sport,
        eventDate: bet.event_start.slice(0, 10),
        externalEventId: bet.external_event_id,
      });
    }
  }

  return requests;
}

// Looks up current score/status for a batch of linked games at once,
// fetching each distinct sport+date scoreboard only once regardless of
// how many bets/legs share that date.
export async function fetchLiveStatuses(
  requests: LiveStatusRequest[],
): Promise<Map<string, EspnEvent>> {
  const byDateKey = new Map<
    string,
    { sport: string; eventDate: string }
  >();
  for (const req of requests) {
    byDateKey.set(`${req.sport}:${req.eventDate}`, req);
  }

  const eventsByDateKey = new Map<string, EspnEvent[]>();
  await Promise.all(
    Array.from(byDateKey.entries()).map(async ([key, { sport, eventDate }]) => {
      try {
        eventsByDateKey.set(key, await searchEspnEvents(sport, eventDate));
      } catch {
        eventsByDateKey.set(key, []);
      }
    }),
  );

  const result = new Map<string, EspnEvent>();
  for (const req of requests) {
    const events = eventsByDateKey.get(`${req.sport}:${req.eventDate}`) ?? [];
    const match = events.find((e) => e.id === req.externalEventId);
    if (match) result.set(req.externalEventId, match);
  }

  return result;
}
