import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { DeviceStrip } from "@/components/device-strip";
import { IncidentCard } from "@/components/incident-card";
import { RadiusControl } from "@/components/radius-control";
import { RequestHelp } from "@/components/request-help";
import { WorldMap, inRadius } from "@/components/world-map";
import { useClientState } from "@/lib/client-state";
import { listIncidents } from "@/lib/server/incidents";
import { useDevice } from "@/lib/use-device";
import type { Incident } from "@/lib/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const device = useDevice();
  const radiusKm = useClientState((s) => s.radiusKm);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
  const countries = new Set(visible.map((i) => i.countryCode).filter(Boolean)).size;

  return (
    <AppShell>
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex min-h-0 flex-col gap-4">
          <div className="space-y-3">
            <p className="text-xs tracking-[0.18em] text-subtle uppercase">Global help network</p>
            <h1 className="font-display text-3xl leading-tight tracking-tight md:text-4xl">
              Need help. Send a signal.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Hold SOS to broadcast your coordinates, battery, and what you need. Anyone
              nearby — or a coordinator anywhere — can call local services for you, in the
              right language.
            </p>
            <RequestHelp device={device} onCreated={() => void refresh()} />
          </div>

          <DeviceStrip device={device} />

          <div className="flex min-h-72 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex flex-col gap-2 border-b border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                <span className="tabular text-fg">{openCount}</span> live signals
                {countries ? ` · ${countries} countries` : ""}
                {radiusKm ? ` within ${radiusKm} km` : " worldwide"}
              </p>
              <RadiusControl />
            </div>
            <div className="min-h-64 flex-1">
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
            <h2 className="font-display text-lg">Live feed</h2>
            <p className="text-xs text-subtle">Newest first</p>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto md:max-h-[calc(100dvh-10rem)]">
            {loading ? (
              <div className="space-y-2">
                <div className="h-24 animate-pulse rounded-lg bg-surface" />
                <div className="h-24 animate-pulse rounded-lg bg-surface" />
              </div>
            ) : visible.length === 0 ? (
              <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
                No open signals in this range. Widen the filter, or be the first to help when one appears.
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
