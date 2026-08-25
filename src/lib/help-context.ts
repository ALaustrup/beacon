import type { IncidentUpdate } from "./types";
import type { FollowUpQuestion, HelpRequestFor, IncidentMapping } from "./help-taxonomy";

export const HELP_CONTEXT_KIND = "context";

export type HelpContextPayload = {
  v: 1;
  c: string | null;
  s: string;
  r: HelpRequestFor;
  eg: boolean;
  silent: boolean;
  q: string | null;
  need: string;
  answered?: string;
};

export function formatHelpContextNote(mapping: IncidentMapping): string {
  const payload: HelpContextPayload = {
    v: 1,
    c: mapping.categoryId,
    s: mapping.helpSubtype,
    r: mapping.requestFor,
    eg: mapping.emergencyCall,
    silent: mapping.silent,
    q: mapping.followUp?.id ?? null,
    need: mapping.needKey,
  };
  return `${mapping.label}\n${JSON.stringify(payload)}`;
}

export function parseHelpContext(body: string): HelpContextPayload | null {
  const line = body
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.startsWith("{") && part.includes('"v":1'));
  if (!line) return null;
  try {
    const parsed = JSON.parse(line) as HelpContextPayload;
    if (parsed.v !== 1 || typeof parsed.s !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function headlineFromUpdates(updates: IncidentUpdate[]): string | null {
  for (let i = updates.length - 1; i >= 0; i -= 1) {
    const row = updates[i];
    if (!row) continue;
    const parsed = parseHelpContext(row.body);
    if (!parsed || parsed.s === "followup") continue;
    const label = row.body.split("\n")[0]?.trim();
    return label || null;
  }
  return null;
}

export function contextFromUpdates(updates: IncidentUpdate[]): HelpContextPayload | null {
  for (let i = updates.length - 1; i >= 0; i -= 1) {
    const row = updates[i];
    if (!row) continue;
    if (row.kind !== HELP_CONTEXT_KIND && row.kind !== "note") continue;
    const parsed = parseHelpContext(row.body);
    if (parsed && parsed.s !== "followup") return parsed;
  }
  return null;
}

export function followUpAnswered(updates: IncidentUpdate[], questionId: string): boolean {
  return updates.some((row) => {
    const parsed = parseHelpContext(row.body);
    return parsed?.q === questionId && Boolean(parsed.answered);
  });
}

export function formatFollowUpNote(
  question: FollowUpQuestion,
  optionId: string,
): string {
  const option = question.options.find((item) => item.id === optionId);
  const payload = {
    v: 1,
    c: null,
    s: "followup",
    r: "self" as HelpRequestFor,
    eg: false,
    silent: false,
    q: question.id,
    need: "followup",
    answered: optionId,
  };
  return `${question.prompt} ${option?.label ?? optionId}\n${JSON.stringify(payload)}`;
}
