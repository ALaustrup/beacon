import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { CallScripts } from "@/components/call-scripts";
import { ContextQuestion } from "@/components/context-question";
import { HelperCapabilities } from "@/components/helper-capabilities";
import { ThreadChat } from "@/components/thread-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { statusVariant } from "@/components/incident-card";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useActorName, useClientState } from "@/lib/client-state";
import { contextFromUpdates, headlineFromUpdates } from "@/lib/help-context";
import { verifiedEmergencyCall } from "@/lib/emergency";
import { trackHelpEvent } from "@/lib/help-telemetry";
import { isUnspecifiedHelpType } from "@/lib/help-taxonomy";
import { bearingLabel, formatDistance, haversineKm } from "@/lib/geo";
import {
  helpTypeById,
  OFFER_ETA_MINUTES,
  SOS_HOLD_TYPE,
  SOS_TYPE_CORRECTIONS,
  type OfferEtaMinutes,
} from "@/lib/help-types";
import {
  getIncident,
  offerHelp,
  resolveIncident,
  updateIncidentType,
} from "@/lib/server/incidents";
import { sendAid } from "@/lib/server/wallet";
import { useDevice } from "@/lib/use-device";
import type { Helper, IncidentDetail } from "@/lib/types";
import { formatCoord, formatMoney, timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/incident/$id")({ component: IncidentPage });

function IncidentPage() {
  const { id } = Route.useParams();
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [aid, setAid] = useState("10");
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [claimRole, setClaimRole] = useState<"local" | "remote" | null>(null);
  const [claimEta, setClaimEta] = useState<OfferEtaMinutes | null>(null);
  const user = useCurrentUser();
  const guestId = useClientState((s) => s.guestId);
  const language = useClientState((s) => s.language);
  const actorName = useActorName(user?.displayName);
  const device = useDevice();
  const actorId = user?.id ?? guestId;

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
  const helpContext = contextFromUpdates(detail.updates);
  const headline =
    headlineFromUpdates(detail.updates) ||
    (isUnspecifiedHelpType(detail.helpType) ? "Help needed" : meta.label);
  const showEmergencyGuidance = Boolean(helpContext?.eg);
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
  const isCreator = Boolean(detail.requesterId && detail.requesterId === actorId);
  const live = detail.status !== "resolved";
  const showTypeChooser = isCreator && live && detail.helpType === SOS_HOLD_TYPE;
  const myClaim = detail.helpers.find((h) => h.userId && h.userId === user?.id) ?? null;
  const latest = detail.updates[detail.updates.length - 1] ?? null;
  const distanceLabel =
    km != null ? `${formatDistance(km)}${bearing ? ` ${bearing}` : ""}` : "Need your GPS";

  async function onOffer() {
    if (!user) {
      toast.error("Sign in to attach your name to an offer.");
      return;
    }
    if (!claimRole || claimEta == null) {
      toast.error("Choose nearby or remote, then an arrival time.");
      return;
    }
    setBusy(true);
    try {
      await offerHelp({
        data: { incidentId: id, name: actorName, role: claimRole, etaMinutes: claimEta },
      });
      toast.success(
        claimRole === "local" ? "You are marked as nearby help." : "You are coordinating remotely.",
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not offer help.");
    } finally {
      setBusy(false);
    }
  }

  async function onResolve() {
    setBusy(true);
    try {
      await resolveIncident({
        data: { incidentId: id, authorName: actorName, authorId: actorId },
      });
      setConfirmClose(false);
      trackHelpEvent("request_resolved");
      toast.success("Signal closed.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not close.");
    } finally {
      setBusy(false);
    }
  }

  async function onCorrectType(helpType: string) {
    setBusy(true);
    try {
      await updateIncidentType({
        data: { incidentId: id, helpType, authorId: actorId, authorName: actorName },
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update type.");
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

  function openConversation() {
    setConversationOpen(true);
    window.setTimeout(() => {
      const composer = document.getElementById("incident-composer");
      composer?.scrollIntoView({ behavior: "smooth", block: "end" });
      document.getElementById("incident-message-input")?.focus();
    }, 50);
  }

  return (
    <AppShell>
      <div className="mb-4">
        <Link to="/" className="text-xs text-muted-foreground hover:text-fg">
          Back to live map
        </Link>
      </div>

      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl tracking-tight">{headline}</h1>
            <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
            {detail.demo ? <Badge variant="outline">DEMO</Badge> : null}
          </div>
          {isCreator ? (
            <p className="text-base font-medium">{liveStatus(detail)}</p>
          ) : (
            <p className="text-muted-foreground">
              {detail.requesterName} · {timeAgo(detail.createdAt)} · {distanceLabel}
            </p>
          )}
          {isCreator ? (
            <p className="text-sm text-muted-foreground">
              {detail.locationLabel} · {timeAgo(detail.createdAt)}
            </p>
          ) : null}
          <p className="max-w-2xl text-base leading-relaxed">{detail.description}</p>
        </header>

        {showEmergencyGuidance ? (
          <p className="text-sm text-muted-foreground" role="status">
            If anyone is in immediate danger, call emergency services now. Beacon is still looking for help.
          </p>
        ) : null}

        <OfficialCall
          countryCode={detail.countryCode}
          onUsed={() => trackHelpEvent("emergency_cta_used", helpContext?.need)}
          onNeutralClick={
            isCreator
              ? () => {
                  setScriptOpen(true);
                  window.setTimeout(() => {
                    document.getElementById("call-script")?.scrollIntoView({ behavior: "smooth" });
                  }, 50);
                }
              : undefined
          }
        />

        <ContextQuestion
          incident={detail}
          actorId={actorId}
          actorName={actorName}
          isCreator={isCreator}
          onAnswered={() => void refresh()}
        />

        {isCreator && live ? (
          <div>
            <Button variant="outline" disabled={busy} onClick={() => setConfirmClose(true)}>
              I’m OK — cancel
            </Button>
          </div>
        ) : null}

        {isCreator ? (
          <section className="space-y-2">
            <h2 className="font-display text-lg">Helpers</h2>
            <HelperList helpers={detail.helpers} empty="Waiting for a helper." />
            <p className="text-sm text-muted-foreground">{locationQuality(detail)}</p>
            {showTypeChooser ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="self-center text-xs text-subtle">What kind</span>
                {SOS_TYPE_CORRECTIONS.map((c) => (
                  <Button
                    key={c.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void onCorrectType(c.id)}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {!isCreator && live ? (
          <section className="space-y-3">
            <div>
              <h2 className="font-display text-lg">Already responding</h2>
              <HelperList helpers={detail.helpers} empty="No one has claimed this yet." />
            </div>
            <CallScripts incident={detail} />
            {myClaim ? (
              <div className="space-y-3">
                <p className="text-sm">
                  You are helping · {roleLabel(myClaim.role)}
                  {etaLabel(myClaim.etaMinutes)}
                </p>
                <HelperCapabilities
                  incident={detail}
                  actorName={actorName}
                  authorId={user?.id ?? null}
                  enabled
                />
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
                <h2 className="font-display text-lg">I can help</h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={claimRole === "local" ? "default" : "outline"}
                    disabled={busy}
                    onClick={() => setClaimRole("local")}
                  >
                    Nearby
                  </Button>
                  <Button
                    type="button"
                    variant={claimRole === "remote" ? "default" : "outline"}
                    disabled={busy}
                    onClick={() => setClaimRole("remote")}
                  >
                    Remote
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-subtle">ETA</span>
                  {OFFER_ETA_MINUTES.map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={claimEta === m ? "default" : "outline"}
                      disabled={busy}
                      onClick={() => setClaimEta(m)}
                    >
                      {m} min
                    </Button>
                  ))}
                </div>
                <Button disabled={busy || !claimRole || claimEta == null} onClick={() => void onOffer()}>
                  Confirm I can help
                </Button>
              </div>
            )}
          </section>
        ) : null}

        {!isCreator && !live ? <CallScripts incident={detail} /> : null}

        <section className="space-y-2">
          <h2 className="font-display text-lg">Latest</h2>
          {latest ? (
            <p className="text-sm">
              <span className="text-subtle">{latest.authorName} · {timeAgo(latest.createdAt)} · </span>
              {latest.body.split("\n").find((line) => !line.startsWith("{")) ?? latest.body}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          )}
          <Button variant="outline" size="sm" onClick={openConversation}>
            Message
          </Button>
        </section>

        {isCreator ? (
          <details
            className="rounded-xl border border-border bg-surface p-4"
            open={scriptOpen}
            onToggle={(e) => setScriptOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="font-display cursor-pointer text-lg">What to say</summary>
            <div className="mt-3">
              <CallScripts incident={detail} />
            </div>
          </details>
        ) : null}

        <details
          id="incident-conversation"
          className="above-mobile-nav rounded-xl border border-border bg-surface p-4"
          open={conversationOpen}
          onToggle={(e) => setConversationOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="font-display cursor-pointer text-lg">Conversation</summary>
          <div className="mt-3">
            <ThreadChat
              incidentId={id}
              actorName={actorName}
              authorId={user?.id ?? guestId}
              language={language}
              hideHeading
            />
          </div>
        </details>

        <details className="rounded-xl border border-border bg-surface p-4">
          <summary className="font-display cursor-pointer text-lg">More</summary>
          <div className="mt-4 space-y-4">
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
            </div>
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
              <Fact label="Distance" value={distanceLabel} />
              <Fact label="Language" value={detail.language.toUpperCase()} />
              <Fact label="Country" value={detail.countryCode ?? "—"} />
            </dl>
            <div>
              <h3 className="font-display text-lg">Send aid</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {detail.demo
                  ? "Demo credit — not real money."
                  : "Instant Beacon credit for food, fuel, a ride, or a room. Sign in required."}
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
            </div>
          </div>
        </details>
      </div>

      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this signal?</DialogTitle>
            <DialogDescription>
              This closes the signal. Helpers should stop coming.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirmClose(false)}>
              Keep it live
            </Button>
            <Button disabled={busy} onClick={() => void onResolve()}>
              I’m OK — cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function OfficialCall({
  countryCode,
  onNeutralClick,
  onUsed,
}: {
  countryCode: string | null;
  onNeutralClick?: () => void;
  onUsed?: () => void;
}) {
  const verified = verifiedEmergencyCall(countryCode);
  if (verified) {
    return (
      <Button asChild size="lg">
        <a href={verified.href} onClick={onUsed}>
          {verified.label}
        </a>
      </Button>
    );
  }
  if (onNeutralClick) {
    return (
      <Button size="lg" onClick={onNeutralClick}>
        Call local emergency
      </Button>
    );
  }
  return (
    <Button asChild size="lg">
      <a href="#call-script">Call local emergency</a>
    </Button>
  );
}

function HelperList({ helpers, empty }: { helpers: Helper[]; empty: string }) {
  if (helpers.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-1 text-sm">
      {helpers.map((h) => (
        <li key={h.id}>
          {h.name}
          <span className="text-subtle">
            {" "}
            · {roleLabel(h.role)}
            {etaLabel(h.etaMinutes)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function liveStatus(detail: IncidentDetail) {
  if (detail.status === "resolved") return "Closed";
  if (detail.helpers.length === 0) return "Waiting for a helper";
  if (detail.helpers.length === 1) return "1 person responding";
  return `${detail.helpers.length} people responding`;
}

function locationQuality(detail: IncidentDetail) {
  if (detail.accuracyM != null) {
    return `GPS ±${Math.round(detail.accuracyM)} m`;
  }
  return `Last known · ${detail.locationLabel}`;
}

function roleLabel(role: string) {
  return role === "local" ? "nearby" : role === "remote" ? "remote" : role;
}

function etaLabel(minutes: number | null) {
  return minutes == null ? "" : ` · ${minutes} min`;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
