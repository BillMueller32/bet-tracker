import { createClient } from "@/lib/supabase/server";
import { generateInsights, type Insight } from "@/lib/bets/insights";

const TONE_BORDER: Record<Insight["tone"], string> = {
  positive: "border-green-900",
  negative: "border-red-900",
  neutral: "border-neutral-800",
};

const TONE_TEXT: Record<Insight["tone"], string> = {
  positive: "text-green-400",
  negative: "text-red-400",
  neutral: "text-neutral-100",
};

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className={`rounded-lg border bg-neutral-900 p-4 ${TONE_BORDER[insight.tone]}`}>
      <p className="text-xs font-medium text-neutral-400">
        <span className="mr-1.5">{insight.icon}</span>
        {insight.title}
      </p>
      <p className={`mt-1.5 text-lg font-semibold ${TONE_TEXT[insight.tone]}`}>
        {insight.headline}
      </p>
      <p className="mt-1 text-sm text-neutral-400">{insight.detail}</p>
    </div>
  );
}

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: bets, error } = await supabase
    .from("bets")
    .select("sport, bet_type, status, odds, stake, placed_at, settled_at");

  const insights = bets ? generateInsights(bets) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-100">Insights</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Observations computed from your own betting history — not
          predictions.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          Couldn&apos;t load insights: {error.message}
        </p>
      )}

      {!error && insights.length === 0 && (
        <p className="rounded-md border border-dashed border-neutral-700 p-6 text-center text-sm text-neutral-400">
          Not enough settled bets yet to surface reliable patterns. Insights
          need at least 5 decided bets in a market, or 10+ logged bets
          overall.
        </p>
      )}

      {!error && insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((insight) => (
            <InsightCard key={insight.title} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
