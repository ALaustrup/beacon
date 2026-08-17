import { useMemo, useState } from "react";
import { toast } from "sonner";
import { buildCallScript, emergencyForCountry } from "@/lib/emergency";
import { langLabel } from "@/lib/help-types";
import type { Incident } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CallScripts({ incident }: { incident: Incident }) {
  const emergency = emergencyForCountry(incident.countryCode);
  const script = useMemo(
    () =>
      buildCallScript({
        helpType: incident.helpType,
        lat: incident.lat,
        lng: incident.lng,
        canPay: incident.canPay,
        countryCode: incident.countryCode,
      }),
    [incident],
  );
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success("Copied. Read this to the local dispatcher.");
      window.setTimeout(() => setCopied(null), 1600);
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg">Local emergency numbers</h2>
        <p className="text-sm text-muted-foreground">
          Official services first. Beacon is a human network, not a replacement for 112 / 911.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumberTile label="Police" value={emergency.police} />
        <NumberTile label="Ambulance" value={emergency.ambulance} />
        <NumberTile label="Fire" value={emergency.fire} />
      </div>
      {emergency.note ? (
        <p className="text-xs text-muted-foreground">{emergency.note}</p>
      ) : null}

      <div className="flex items-center gap-2 pt-2">
        <h3 className="text-sm font-medium">What to say</h3>
        <Badge variant="outline">{langLabel(script.localLang)}</Badge>
      </div>
      <ul className="space-y-2">
        {script.lines.map((line) => (
          <li key={line.key} className="rounded-md border border-border bg-elevated p-3">
            <p className="text-sm leading-relaxed">{line.local}</p>
            {script.localLang !== "en" ? (
              <p className="mt-1 text-xs text-muted-foreground">{line.english}</p>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-8 px-2"
              onClick={() => copy(line.local, line.key)}
            >
              {copied === line.key ? "Copied" : "Copy for the call"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NumberTile({ label, value }: { label: string; value: string }) {
  const tel = value.replace(/[^\d+]/g, "");
  return (
    <a
      href={`tel:${tel}`}
      className="rounded-md border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary/40"
    >
      <p className="text-xs text-subtle">{label}</p>
      <p className="font-display text-2xl tabular tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Tap to call</p>
    </a>
  );
}
