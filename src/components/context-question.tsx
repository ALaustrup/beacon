import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HELP_CATEGORIES, takeHelpAsk } from "@/lib/help-taxonomy";
import {
  contextFromUpdates,
  followUpAnswered,
  formatFollowUpNote,
} from "@/lib/help-context";
import { addIncidentNote } from "@/lib/server/incidents";
import { trackHelpEvent } from "@/lib/help-telemetry";
import type { IncidentDetail } from "@/lib/types";

export function ContextQuestion({
  incident,
  actorId,
  actorName,
  isCreator,
  onAnswered,
}: {
  incident: IncidentDetail;
  actorId: string | null;
  actorName: string;
  isCreator: boolean;
  onAnswered: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [stashed] = useState(() => takeHelpAsk());
  if (!isCreator || incident.status === "resolved") return null;

  const context = contextFromUpdates(incident.updates);
  const questionId = context?.q ?? stashed?.followUp?.id ?? null;
  if (!questionId) return null;
  if (followUpAnswered(incident.updates, questionId)) return null;

  const followUp =
    stashed?.followUp ??
    HELP_CATEGORIES.flatMap((category) => category.options).find(
      (option) => option.followUp?.id === questionId,
    )?.followUp ??
    null;
  if (!followUp) return null;
  const question = followUp;

  async function answer(optionId: string) {
    setBusy(true);
    try {
      await addIncidentNote({
        data: {
          incidentId: incident.id,
          authorId: actorId,
          authorName: actorName,
          kind: "context",
          body: formatFollowUpNote(question, optionId),
        },
      });
      trackHelpEvent("question_answered", question.id);
      onAnswered();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-2xl border border-border bg-surface px-4 py-4"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">One question, if you can</p>
      <p className="mt-1 font-display text-xl tracking-tight">{question.prompt}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {question.options.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant="outline"
            disabled={busy}
            className="min-h-12 min-w-24"
            onClick={() => void answer(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
