import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { CallScripts } from "@/components/call-scripts";
import { ThreadChat } from "@/components/thread-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { statusVariant } from "@/components/incident-card";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useActorName, useClientState } from "@/lib/client-state";
import { bearingLabel, formatDistance, haversineKm } from "@/lib/geo";
import { helpTypeById } from "@/lib/help-types";
import {
  addIncidentNote,
  getIncident,
  offerHelp,
  resolveIncident,
} from "@/lib/server/incidents";
import { sendAid } from "@/lib/server/wallet";
import { useDevice } from "@/lib/use-device";
import type { IncidentDetail } from "@/lib/types";
import { formatCoord, formatMoney, timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/incident/$id")({ component: IncidentPage });

function IncidentPage() {
  const { id } = Route.useParams();
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [note, setNote] = useState("");
  const [aid, setAid] = useState("10");
  const [busy, setBusy] = useState(false);
  const user = useCurrentUser();
  const guestId = useClientState((s) => s.guestId);
  const language = useClientState((s) => s.language);
  const actorName = useActorName(user?.displayName);
  const device = useDevice();

  async function refresh() {
    const row = await getIncident({ data: id });
    if (!row) setMissing(true);
    else setDetail(row);
  }

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (missing) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">This signal was not found.</p>
      </AppShell>
    );
  }
  if (!detail) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-xl bg-surface" />
      </AppShell>
    );
  }

  const meta = helpTypeById(detail.helpType);
  const km =
    device.lat != null && device.lng != null
      ? haversineKm(device.lat, device.lng, detail.lat, detail.lng)
      : null;
  const bearing =
    device.lat != null && device.lng != null
      ? bearingLabel(device.lat, device.lng, detail.lat, detail.lng)
      : null;
  const mapsUrl = `https://www.google.com/maps?q=${detail.lat},${detail.lng}`;
  const coords = `${formatCoord(detail.lat)}, ${formatCoord(detail.lng)}`;

  async function onOffer(role: "local" | "remote") {
    if (!user) {
      toast.error("Sign in to attach your name to an offer.");
      return;
    }
    setBusy(true);
    try {
      await offerHelp({ data: { incidentId: id, name: actorName, role } });
      toast.success(role === "local" ? "You are marked as nearby help." : "You are coordinating remotely.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not offer help.");
    } finally {
      setBusy(false);
    }
  }

  async function onNote() {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await addIncidentNote({
        data: {
          incidentId: id,
          authorId: user?.id ?? guestId,
          authorName: actorName,
          body: note,
        },
      });
      setNote("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post.");
    } finally {
      setBusy(false);
    }
  }

  async function onResolve() {
    setBusy(true);
    try {
      await resolveIncident({
        data: { incidentId: id, authorName: actorName, authorId: user?.id ?? guestId },
      });
      toast.success("Signal closed.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not close.");
    } finally {
      setBusy(false);
    }
  }

  async function onSendAid() {
    if (!user) {
      toast.error("Sign in to send aid credit.");
      return;
    }
    const cents = Math.round(Number(aid) * 100);
    setBusy(true);
    try {
      await sendAid({
        data: {
          amountCents: cents,
          toIncidentId: id,
          fromName: actorName,
          memo: `Aid for ${detail?.helpType ?? "help"}`,
        },
      });
      toast.success("Aid sent.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed.");
    } finally {
      setBusy(false);
    }
  }

  function copyCoords() {
    void navigator.clipboard.writeText(coords).then(() => {
      toast.success("Coordinates copied.");
    });
  }

  function shareSignal() {
    const url = window.location.href;
    const text = `${meta.label} in ${detail?.locationLabel ?? ""}. ${coords}`;
    if (navigator.share) {
      void navigator.share({ title: "Beacon signal", text, url }).catch(() => undefined);
      return;
    }
    void navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
      toast.success("Signal link copied.");
    });
  }

  return (
    <AppShell>
      <div className="mb-4">
        <Link to="/" className="text-xs text-muted-foreground hover:text-fg">
          Back to live map
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl tracking-tight">{meta.label}</h1>
              <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
            </div>
            <p className="text-muted-foreground">
              {detail.requesterName} · {detail.locationLabel} · {timeAgo(detail.createdAt)}
            </p>
            <p className="max-w-2xl text-base leading-relaxed">{detail.description}</p>
          </header>

          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Fact label="Latitude" value={formatCoord(detail.lat)} />
            <Fact label="Longitude" value={formatCoord(detail.lng)} />
            <Fact
              label="Accuracy"
              value={detail.accuracyM != null ? `${Math.round(detail.accuracyM)} m` : "—"}
            />
            <Fact
              label="Battery"
              value={
                detail.batteryPct != null
                  ? `${detail.batteryPct}%${detail.charging ? " charging" : ""}`
                  : "Not reported"
              }
            />
            <Fact label="Can pay" value={detail.canPay ? "Yes" : "No"} />
            <Fact label="Aid received" value={formatMoney(detail.aidCents)} />
            <Fact
              label="Distance"
              value={
                km != null
                  ? `${formatDistance(km)}${bearing ? ` ${bearing}` : ""}`
                  : "Need your GPS"
              }
            />
            <Fact label="Language" value={detail.language.toUpperCase()} />
            <Fact label="Country" value={detail.countryCode ?? "—"} />
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={mapsUrl} target="_blank" rel="noreferrer">
                Open in maps
              </a>
            </Button>
            <Button variant="outline" onClick={copyCoords}>
              Copy coordinates
            </Button>
            <Button variant="outline" onClick={shareSignal}>
              Share signal
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void onOffer("local")}>
              I can help nearby
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void onOffer("remote")}>
              Coordinate remotely
            </Button>
            {detail.status !== "resolved" ? (
              <Button variant="ghost" disabled={busy} onClick={() => void onResolve()}>
                Mark resolved
              </Button>
            ) : null}
          </div>

          <CallScripts incident={detail} />

          <ThreadChat
            incidentId={id}
            actorName={actorName}
            authorId={user?.id ?? guestId}
            language={language}
          />

          <section className="space-y-3">
            <h2 className="font-display text-lg">Log</h2>
            <ul className="space-y-2">
              {detail.updates.map((u) => (
                <li key={u.id} className="border-border border-l-2 pl-3 text-sm">
                  <p className="text-xs text-subtle">
                    {u.authorName} · {u.kind} · {timeAgo(u.createdAt)}
                  </p>
                  <p>{u.body}</p>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Update the people helping — what you see, what you called, what is still needed."
              />
            </div>
            <Button variant="secondary" disabled={busy} onClick={() => void onNote()}>
              Post update
            </Button>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="font-display text-lg">Helpers</h2>
            {detail.helpers.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No one has claimed this yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {detail.helpers.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <span>{h.name}</span>
                    <span className="text-subtle">{h.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="font-display text-lg">Send aid</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Instant Beacon credit for food, fuel, a ride, or a room. Sign in required.
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                inputMode="decimal"
                value={aid}
                onChange={(e) => setAid(e.target.value)}
                aria-label="Amount in dollars"
              />
              <Button disabled={busy} onClick={() => void onSendAid()}>
                Send
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
