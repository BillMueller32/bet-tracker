import Anthropic from "@anthropic-ai/sdk";
import { SPORTS, BET_TYPES } from "./constants";

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export type ExtractedBet = {
  sport: string;
  event_name: string;
  bet_type: string;
  participant?: string;
  selection: string;
  line?: number;
  odds?: number;
  stake?: number;
};

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

  return toolUse.input as ExtractedBet;
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
              },
              participant: {
                type: "string",
                description:
                  "The specific player or team the bet is about (for props, outrights, or match bets). Omit if not applicable.",
              },
              selection: {
                type: "string",
                description:
                  'What was bet on, in plain terms, e.g. "Bills -3.5" or "Mahomes Over 275.5 passing yards".',
              },
              line: {
                type: "number",
                description: "The point spread/total/prop number, if any.",
              },
              odds: {
                type: "number",
                description: "American odds, e.g. -110 or 150.",
              },
              stake: {
                type: "number",
                description:
                  "Dollar amount wagered, if visible in the screenshot.",
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
              text: "Extract the bet details from this bet slip screenshot.",
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
