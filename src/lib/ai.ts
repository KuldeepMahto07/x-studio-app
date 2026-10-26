import "server-only";
import { env, fakeAi } from "./env";
import { MAX_POST_LEN, type Niche } from "./types";

export function buildPrompt(n: Niche, topic: string, format: string, recent: string[]): string {
  const recentBlock = recent.map((p) => `- ${p}`).join("\n") || "- (none yet)";
  return `You write posts for an X (Twitter) account.

Niche: ${n.niche}
Audience: ${n.audience}
Voice: ${n.voice}

Write ONE post.
Topic: ${topic}
Format: ${format}

Rules:
- Max ${MAX_POST_LEN - 20} characters total, including spaces and line breaks.
- Concrete and specific: name real tools, numbers, or steps. No vague hype.
- No hashtags unless truly natural (at most 1). At most 1 emoji.
- Don't invent news, release dates, or statistics you are not sure of.
- Don't repeat ideas from these recent posts:
${recentBlock}

Reply with the post text only, no quotes, no preamble.`;
}

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

// Used when the configured model is busy, slow, or unavailable. Lite models stay responsive under load.
const FALLBACK_MODEL = "gemini-3.5-flash-lite";
const TIMEOUT_MS = 25_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type GeminiResult = { ok: true; text: string } | { ok: false; busy: boolean; error: string };

async function callModel(model: string, prompt: string): Promise<GeminiResult> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, busy: res.status === 429 || res.status === 503, error: `Gemini ${model} error (${res.status}): ${(await res.text()).slice(0, 200)}` };
    }
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return { ok: true, text: json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "" };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return { ok: false, busy: true, error: timedOut ? `Gemini ${model} timed out after ${TIMEOUT_MS / 1000}s` : `Gemini ${model}: ${String(err)}` };
  }
}

/** Calls Gemini with a timeout, one retry when busy, then the fallback model. */
async function callGemini(prompt: string): Promise<string> {
  const models = [...new Set([env.geminiModel, FALLBACK_MODEL])];
  let lastError = "";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callModel(model, prompt);
      if (result.ok) return result.text;
      lastError = result.error;
      if (!result.busy) break; // e.g. model not available to this key: go straight to the fallback
      if (attempt === 0) await sleep(1500);
    }
  }
  throw new Error(lastError);
}

function fakePost(n: Niche, topic: string, format: string): string {
  const openers = ["Quick tip:", "Underrated:", "Hot take:", "Most people miss this:", "Try this today:"];
  return `${pick(openers)} ${topic}. (${format}, demo post for "${n.niche.slice(0, 60)}". Add a GEMINI_API_KEY for real writing.)`.slice(0, MAX_POST_LEN);
}

/** Writes one post for the niche, retrying until it fits in an X post. */
export async function writePost(n: Niche, recent: string[]) {
  const topic = pick(n.topics);
  const format = pick(n.formats);
  if (fakeAi) return { text: fakePost(n, topic, format), topic, format };

  let prompt = buildPrompt(n, topic, format, recent);
  for (let attempt = 0; attempt < 3; attempt++) {
    const text = (await callGemini(prompt)).trim().replace(/^"|"$/g, "").trim();
    if (text && text.length <= MAX_POST_LEN) return { text, topic, format };
    prompt += `\n\nYour last answer was ${text.length} characters. Make it shorter.`;
  }
  throw new Error(`Couldn't get a post under ${MAX_POST_LEN} characters. Try again.`);
}
