import Anthropic from "@anthropic-ai/sdk";
import { SPORTS, BET_TYPES } from "./constants";

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export type ExtractedLeg = {
  sport: string;
  event_name: string;
  participant?: string;
  selection: string;
  line?: number;
  odds?: number;
};

export type ExtractedBet = {
  sport: string;
  event_name: string;
  bet_type: string;
  participant?: string;
  selection: string;
  line?: number;
  odds?: number;
  stake?: number;
  // Only present for parlay/teaser bets: one entry per leg.
  legs?: ExtractedLeg[];
};

// Teaser tickets often show payout as "stake/to-win" (e.g. "$30/$25")
// instead of American odds. When that's all we got, back into odds so the
// form's required Odds field isn't left blank.
function americanOddsFromToWin(stake: number, toWin: number): number {
  return toWin >= stake
    ? Math.round((toWin / stake) * 100)
    : -Math.round((stake / toWin) * 100);
}

export async function extractBetFromImage(
  imageBase64: string,
  mediaType: string,
): Promise<ExtractedBet> {
  if (!SUPPORTED_MEDIA_TYPES.includes(mediaType as SupportedMediaType)) {
    throw new Error(`Unsupported image type: ${mediaType}`);
  }

  const response = await createExtraction(
    imageBase64,
    mediaType as SupportedMediaType,
  );

  const toolUse = response.content.find(
    (block) => block.type === "tool_use",
  );
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Couldn't read bet details from this screenshot.");
  }

  const input = toolUse.input as ExtractedBet & { to_win?: number };
  if (input.odds === undefined && input.to_win && input.stake) {
    input.odds = americanOddsFromToWin(input.stake, input.to_win);
  }

  return input;
}

// Server Action errors are sent back to the browser through React's Flight
// protocol, which only handles plain, simple objects. The Anthropic SDK's
// error objects carry things like raw Headers, so if one escapes a server
// action unwrapped, the serialization itself fails and the browser shows a
// cryptic "Minified React error" instead of anything useful. Catching it
// here and re-throwing a plain Error keeps the real message intact.
async function createExtraction(
  imageBase64: string,
  mediaType: SupportedMediaType,
) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    return await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      tools: [
        {
          name: "extract_bet",
          description:
            "Extract structured sports bet details from a screenshot of a bet slip or bet confirmation.",
          input_schema: {
            type: "object",
            properties: {
              sport: {
                type: "string",
                enum: SPORTS.map((s) => s.value),
                description: "Which sport this bet is for.",
              },
              event_name: {
                type: "string",
                description:
                  'The matchup or event, e.g. "Chiefs @ Bills" or "The Open Championship".',
              },
              bet_type: {
                type: "string",
                enum: BET_TYPES.map((t) => t.value),
                description:
                  'Use "teaser" (not "parlay") when the slip says "TEAS"/"Teaser" or shows a point-adjustment bonus per leg (e.g. "(B+10)", "(B+7)") — a teaser moves each leg\'s spread/total by a fixed number of points, which a plain parlay does not. Use "parlay" only when there is no such point adjustment.',
              },
              participant: {
                type: "string",
                description:
                  "The specific player or team the bet is about (for props, outrights, or match bets). Omit if not applicable.",
              },
              selection: {
                type: "string",
                description:
                  'What was bet on, in plain terms, e.g. "Bills -3.5" or "Mahomes Over 275.5 passing yards". For a parlay/teaser, use the ticket\'s own header/title describing it instead (e.g. "3 TEAS FB 10 PT, NBA 7 PT, CBB 6 PT" or "3-Team 10-Point Teaser") — capture that text verbatim so the points value isn\'t lost.',
              },
              line: {
                type: "number",
                description: "The point spread/total/prop number, if any.",
              },
              odds: {
                type: "number",
                description:
                  "American odds, e.g. -110 or 150. Omit if the screenshot only shows a stake/to-win payout instead (use to_win for that).",
              },
              stake: {
                type: "number",
                description:
                  "Dollar amount wagered, if visible in the screenshot.",
              },
              to_win: {
                type: "number",
                description:
                  'Dollar profit if the bet wins, only when shown as a stake/to-win payout (e.g. "$30/$25") instead of American odds. Omit if odds is already provided.',
              },
              legs: {
                type: "array",
                description:
                  "Only for parlay or teaser bets that bundle multiple picks into one wager: one entry per leg/pick, in the order they appear. For a bet with a single pick, omit this entirely and describe it with the sport/event_name/selection/line/odds fields above instead.",
                items: {
                  type: "object",
                  properties: {
                    sport: {
                      type: "string",
                      enum: SPORTS.map((s) => s.value),
                    },
                    event_name: { type: "string" },
                    participant: { type: "string" },
                    selection: {
                      type: "string",
                      description:
                        'What this leg is betting on, e.g. "Bills -3.5" or "Over 48.5".',
                    },
                    line: { type: "number" },
                    odds: {
                      type: "number",
                      description:
                        "This leg's individual odds, if shown separately from the combined bet odds.",
                    },
                  },
                  required: ["sport", "event_name", "selection"],
                },
              },
            },
            required: ["sport", "event_name", "bet_type", "selection"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "extract_bet" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: "Extract the bet details from this bet slip screenshot. If it's a parlay or teaser bundling multiple picks into one wager, set bet_type accordingly and list each pick as its own entry in legs.",
            },
          ],
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    throw new Error(`Couldn't reach the AI model to read this screenshot: ${message}`);
  }
}
