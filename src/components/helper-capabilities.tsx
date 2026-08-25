import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { capabilitiesForNeed } from "@/lib/help-capabilities";
import { contextFromUpdates } from "@/lib/help-context";
import { addIncidentNote } from "@/lib/server/incidents";
import type { IncidentDetail } from "@/lib/types";

export function HelperCapabilities({
  incident,
  actorName,
  authorId,
  enabled,
}: {
  incident: IncidentDetail;
  actorName: string;
  authorId: string | null;
  enabled: boolean;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const context = contextFromUpdates(incident.updates);
  const options = capabilitiesForNeed(context?.need, incident.helpType);
  if (!enabled || options.length === 0) return null;

  async function toggle(id: string, label: string) {
    if (chosen.includes(id) || busy) return;
    setBusy(true);
    try {
      await addIncidentNote({
        data: {
          incidentId: incident.id,
          authorId,
          authorName: actorName,
          kind: "note",
          body: `I can help: ${label}`,
        },
      });
      setChosen((current) => [...current, id]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs tracking-[0.16em] text-subtle uppercase">What you can do</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant={chosen.includes(option.id) ? "default" : "outline"}
            disabled={busy || chosen.includes(option.id)}
            onClick={() => void toggle(option.id, option.label)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
