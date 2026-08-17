import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { IncidentCard } from "@/components/incident-card";
import { listIncidents } from "@/lib/server/incidents";
import { useDevice } from "@/lib/use-device";
import type { Incident } from "@/lib/types";

export const Route = createFileRoute("/log")({ component: LogPage });

function LogPage() {
  const device = useDevice();
  const [rows, setRows] = useState<Incident[]>([]);
  const [showResolved, setShowResolved] = useState(true);

  useEffect(() => {
    void listIncidents({ data: { includeResolved: true } }).then(setRows);
  }, []);

  const visible = showResolved ? rows : rows.filter((r) => r.status !== "resolved");

  return (
    <AppShell>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Incident log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every signal stays on record. Open ones remain on the live map until someone marks them resolved.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Include resolved
        </label>
      </header>
      <div className="space-y-2">
        {visible.map((inc) => (
          <IncidentCard
            key={inc.id}
            incident={inc}
            userLat={device.lat}
            userLng={device.lng}
          />
        ))}
      </div>
    </AppShell>
  );
}
