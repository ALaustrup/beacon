import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { DeviceStrip } from "@/components/device-strip";
import { IncidentCard } from "@/components/incident-card";
import { RadiusControl } from "@/components/radius-control";
import { RequestHelp } from "@/components/request-help";
import { WorldMap, inRadius } from "@/components/world-map";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useClientState } from "@/lib/client-state";
import { listIncidents } from "@/lib/server/incidents";
import { useDevice } from "@/lib/use-device";
import type { Incident } from "@/lib/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const device = useDevice();
  const user = useCurrentUser();
  const guestId = useClientState((s) => s.guestId);
  const radiusKm = useClientState((s) => s.radiusKm);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const actorId = user?.id ?? guestId;

  const refresh = useCallback(async () => {
    const rows = await listIncidents({ data: { includeResolved: false } });
    setIncidents(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const visible = useMemo(
    () => incidents.filter((i) => inRadius(i, device.lat, device.lng, radiusKm)),
    [incidents, device.lat, device.lng, radiusKm],
  );
  const openCount = visible.filter((i) => i.status !== "resolved").length;
  const activeIncident =
    incidents.find((i) => i.requesterId && i.requesterId === actorId && i.status !== "resolved") ??
    null;

  return (
    <AppShell>
      <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="flex min-h-0 flex-col gap-8">
          <div className="flex min-h-[calc(100dvh-9.5rem)] flex-col items-center justify-center gap-5">
            <RequestHelp
              device={device}
              activeIncident={activeIncident}
              onCreated={() => void refresh()}
            />
            <DeviceStrip device={device} compact />
          </div>

          <div className="flex min-h-56 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface">
            <div className="flex flex-col gap-2 border-b border-border/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                <span className="tabular text-fg">{openCount}</span> nearby requests
                {radiusKm ? ` within ${radiusKm} km` : " · worldwide"}
              </p>
              <RadiusControl />
            </div>
            <div className="min-h-52 flex-1">
              <WorldMap
                incidents={visible}
                selectedId={selectedId}
                onSelect={setSelectedId}
                userLat={device.lat}
                userLng={device.lng}
                radiusKm={radiusKm}
              />
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-3">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Open nearby</h2>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto md:max-h-[calc(100dvh-10rem)]">
            {loading ? (
              <div className="space-y-2">
                <div className="h-24 animate-pulse rounded-lg bg-surface" />
                <div className="h-24 animate-pulse rounded-lg bg-surface" />
              </div>
            ) : visible.length === 0 ? (
              <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
                No open requests in this range.
              </p>
            ) : (
              visible.map((inc) => (
                <div key={inc.id} onMouseEnter={() => setSelectedId(inc.id)}>
                  <IncidentCard
                    incident={inc}
                    userLat={device.lat}
                    userLng={device.lng}
                    selected={selectedId === inc.id}
                    compact
                  />
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
