import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { createHash } from "node:crypto";

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

function mymemoryLang(id: string): string {
  if (id === "zh") return "zh-CN";
  return id || "en";
}

async function cachedLookup(sourceHash: string, target: string) {
  const sql = await getSql();
  const cached = await sql<{ translated_text: string }>`
    select translated_text from translations
    where source_hash = ${sourceHash} and target_lang = ${target}
    limit 1
  `;
  return cached[0]?.translated_text ?? null;
}

async function cacheStore(sourceHash: string, target: string, source: string, translated: string) {
  const sql = await getSql();
  await sql`
    insert into translations (source_hash, target_lang, source_text, translated_text)
    values (${sourceHash}, ${target}, ${source}, ${translated})
    on conflict (source_hash, target_lang) do nothing
  `;
}

async function viaMyMemory(text: string, target: string, source?: string): Promise<string | null> {
  const pair = `${mymemoryLang(source || "en")}|${mymemoryLang(target)}`;
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 500));
  url.searchParams.set("langpair", pair);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
    };
    const out = body.responseData?.translatedText?.trim();
    if (!out || body.responseStatus !== 200) return null;
    if (/^\s*invalid/i.test(out) || /myMEMORY/i.test(out)) return null;
    return out;
  } catch {
    return null;
  }
}

async function viaXai(text: string, target: string): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "You translate humanitarian help messages. Return ONLY the translation, no quotes, no notes. Preserve names, numbers, and coordinates exactly. If the text is already in the target language, return it unchanged.",
          },
          {
            role: "user",
            content: `Target language: ${target}\n\n${text}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return body.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function translateOne(text: string, target: string, source?: string) {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true as const, text: "", cached: true };
  if (source && source === target) return { ok: true as const, text: trimmed, cached: true };

  const sourceHash = hashText(`${source ?? "auto"}:${trimmed}`);
  const hit = await cachedLookup(sourceHash, target);
  if (hit) return { ok: true as const, text: hit, cached: true };

  const memory = await viaMyMemory(trimmed, target, source);
  if (memory) {
    await cacheStore(sourceHash, target, trimmed, memory);
    return { ok: true as const, text: memory, cached: false };
  }

  const grok = await viaXai(trimmed, target);
  if (grok) {
    await cacheStore(sourceHash, target, trimmed, grok);
    return { ok: true as const, text: grok, cached: false };
  }

  return { ok: false as const, error: "Translation is unavailable here.", text: trimmed };
}

export const translateText = createServerFn({ method: "POST" })
  .validator((input: { text: string; targetLang: string; sourceLang?: string }) => input)
  .handler(async ({ data }) => {
    return translateOne(data.text, data.targetLang.trim() || "en", data.sourceLang);
  });

export const translateMany = createServerFn({ method: "POST" })
  .validator((input: {
    items: Array<{ id: string; text: string; sourceLang?: string }>;
    targetLang: string;
  }) => input)
  .handler(async ({ data }) => {
    const target = data.targetLang.trim() || "en";
    const items = data.items.slice(0, 12);
    const out: Record<string, string> = {};
    for (const item of items) {
      const res = await translateOne(item.text, target, item.sourceLang);
      out[item.id] = res.text || item.text;
    }
    return { ok: true as const, translations: out };
  });
