import { searchEspnEvents, type EspnEvent } from "./espn";

export type LiveStatusRequest = {
  sport: string;
  eventDate: string; // YYYY-MM-DD, sliced from the stored event_start
  externalEventId: string;
};

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
