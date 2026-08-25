import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { HelpMeControl } from "@/components/help-me-control";
import { RadialSelector } from "@/components/radial-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useClientState } from "@/lib/client-state";
import { HELP_CONTEXT_KIND, formatHelpContextNote } from "@/lib/help-context";
import { localEmergencyLinks } from "@/lib/emergency";
import { HELP_TYPE_IDS, LANGUAGES, SPECIFIC_HELP_TYPES, helpTypeById, type HelpTypeId } from "@/lib/help-types";
import {
  HELP_CATEGORIES,
  categoryById,
  mapHelpSelection,
  mapUnspecifiedRequest,
  stashHelpAsk,
  toHelpLeaf,
  type HelpSelection,
  type IncidentMapping,
} from "@/lib/help-taxonomy";
import { addIncidentNote, createIncident } from "@/lib/server/incidents";
import { lookupCity } from "@/lib/server/lookup";
import { trackHelpEvent } from "@/lib/help-telemetry";
import type { DeviceTelemetry, Incident } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  device: DeviceTelemetry & { locating: boolean; error: string | null };
  activeIncident?: Incident | null;
  onCreated?: () => void;
};

type MenuLevel = "closed" | "level1" | "level2";

export function RequestHelp({ device, activeIncident, onCreated }: Props) {
  const [level, setLevel] = useState<MenuLevel>("closed");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<IncidentMapping | null>(null);
  const [helpType, setHelpType] = useState("other");
  const [description, setDescription] = useState("");
  const [canPay, setCanPay] = useState(false);
  const [city, setCity] = useState("");
  const [cityBusy, setCityBusy] = useState(false);
  const user = useCurrentUser();
  const guestId = useClientState((s) => s.guestId);
  const displayName = useClientState((s) => s.displayName);
  const setDisplayName = useClientState((s) => s.setDisplayName);
  const language = useClientState((s) => s.language);
  const setLanguage = useClientState((s) => s.setLanguage);
  const setManualFix = useClientState((s) => s.setManualFix);
  const recordSosConsent = useClientState((s) => s.recordSosConsent);
  const navigate = useNavigate();

  const name = user?.displayName || displayName;
  const hasFix = device.lat != null && device.lng != null;
  const telLinks = localEmergencyLinks(null);
  const category = categoryById(categoryId);
  const level2Items = category?.options ?? [];
  const menuOpen = level !== "closed";

  const centerMode = useMemo(() => {
    if (menuOpen) return "expanded" as const;
    if (activeIncident) return "resume" as const;
    return "request" as const;
  }, [menuOpen, activeIncident]);

  function closeMenu() {
    setLevel("closed");
    setCategoryId(null);
  }

  function openMenu() {
    if (busy) return;
    trackHelpEvent("help_control_opened");
    setLevel("level1");
  }

  function requestSend(mapping: IncidentMapping) {
    if (activeIncident && !confirmOpen) {
      setPending(mapping);
      setConfirmOpen(true);
      return;
    }
    void submitMapping(mapping);
  }

  function sendUnspecified() {
    const mapping = mapUnspecifiedRequest();
    trackHelpEvent("unspecified_request_sent");
    requestSend(mapping);
  }

  async function submitMapping(mapping: IncidentMapping) {
    if (device.lat == null || device.lng == null) {
      toast.error("Need a location first. Allow GPS or enter a city.");
      closeMenu();
      return;
    }
    setBusy(true);
    try {
      recordSosConsent();
      const incident = await createIncident({
        data: {
          requesterId: user?.id ?? guestId,
          requesterName: name.trim() || "Someone nearby",
          helpType: mapping.helpType,
          description: mapping.description,
          lat: device.lat,
          lng: device.lng,
          accuracyM: device.accuracyM,
          batteryPct: device.batteryPct,
          charging: device.charging,
          canPay,
          language: user ? language : device.language,
        },
      });
      try {
        await addIncidentNote({
          data: {
            incidentId: incident.id,
            authorId: user?.id ?? guestId,
            authorName: name.trim() || "Someone nearby",
            kind: HELP_CONTEXT_KIND,
            body: formatHelpContextNote(mapping),
          },
        });
      } catch {
        /* context note is enrichment, not a blocker */
      }
      stashHelpAsk(toHelpLeaf(mapping));
      trackHelpEvent("incident_created", mapping.helpSubtype);
      if (mapping.emergencyCall) trackHelpEvent("emergency_cta_surfaced", mapping.needKey);
      toast.success("Help is on the way from Beacon.", {
        description: mapping.unspecified
          ? "You can add details when you can."
          : mapping.label,
      });
      setConfirmOpen(false);
      setPending(null);
      closeMenu();
      setDetailsOpen(false);
      onCreated?.();
      void navigate({ to: "/incident/$id", params: { id: incident.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send for help. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDetails(type: string, desc: string, pay: boolean) {
    const meta = helpTypeById(type);
    const mapping: IncidentMapping = {
      ...mapUnspecifiedRequest(),
      helpType: HELP_TYPE_IDS.includes(type as HelpTypeId) ? (type as HelpTypeId) : "other",
      helpSubtype: "details",
      unspecified: type === "emergency",
      label: meta.label,
      description: desc.trim() || `${meta.label}. Please send help.`,
      needKey: `${type}.details`,
    };
    setCanPay(pay);
    await submitMapping(mapping);
  }

  async function applyCityFix(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim()) return;
    setCityBusy(true);
    try {
      const fix = await lookupCity({ data: city });
      if (!fix) {
        toast.error("Could not find that place. Try a city and country.");
        return;
      }
      setManualFix({ lat: fix.lat, lng: fix.lng, label: fix.label });
      toast.success(`Using ${fix.label}`);
    } catch {
      toast.error("Could not look up that place.");
    } finally {
      setCityBusy(false);
    }
  }

  function onCategory(id: string) {
    trackHelpEvent("category_selected", id);
    const next = categoryById(id);
    if (!next || next.unspecified) {
      sendUnspecified();
      return;
    }
    setCategoryId(id);
    setLevel("level2");
  }

  function onSubtype(id: string) {
    trackHelpEvent("subtype_selected", id);
    if (!categoryId) return;
    requestSend(mapHelpSelection({ categoryId, subtypeId: id } satisfies HelpSelection));
  }

  const control = (
    <HelpMeControl
      mode={centerMode}
      busy={busy}
      disabled={busy}
      onOpen={openMenu}
      onSend={sendUnspecified}
      onResume={() => {
        if (activeIncident) {
          void navigate({ to: "/incident/$id", params: { id: activeIncident.id } });
        }
      }}
    />
  );

  return (
    <>
      <div className="flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-[0.7rem] tracking-[0.22em] text-subtle uppercase">Beacon</p>
          <h1 className="font-display text-3xl tracking-tight md:text-4xl">
            {activeIncident ? "Help is already moving." : "Need help?"}
          </h1>
        </div>

        {control}

        {activeIncident ? (
          <button
            type="button"
            onClick={openMenu}
            className="min-h-11 text-sm text-muted-foreground underline-offset-4 hover:text-fg hover:underline"
          >
            Need help again
          </button>
        ) : (
          <p className="max-w-xs text-center text-sm text-muted-foreground">
            Tap to tell us what’s wrong. Hold to send now.
          </p>
        )}

        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
            {telLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="min-h-11 inline-flex items-center text-paper underline-offset-4 hover:underline"
                onClick={() => trackHelpEvent("emergency_cta_used")}
              >
                {link.label}
              </a>
            ))}
          </div>
          <p className="text-xs text-subtle">Beacon is not 911. Call emergency services if someone may die.</p>
        </div>

        {!hasFix ? (
          <form onSubmit={(e) => void applyCityFix(e)} className="w-full max-w-md space-y-2">
            <p className="text-center text-sm text-warn" role="status">
              {device.locating ? "Finding your location…" : device.error || "Location needed to send for help."}
            </p>
            <div className="flex gap-2">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City or address if GPS is blocked"
                aria-label="City or address"
              />
              <Button type="submit" variant="secondary" disabled={cityBusy}>
                {cityBusy ? "Looking…" : "Use place"}
              </Button>
            </div>
          </form>
        ) : device.accuracyM != null && device.accuracyM > 250 ? (
          <p className="text-center text-xs text-warn" role="status">
            Location is approximate (±{Math.round(device.accuracyM)} m). You can still send.
          </p>
        ) : null}

        <button
          type="button"
          className="text-xs text-subtle underline-offset-4 hover:text-muted-foreground hover:underline"
          onClick={() => setDetailsOpen(true)}
        >
          Add details first
        </button>
      </div>

      <RadialSelector
        open={menuOpen}
        title={level === "level2" ? (category?.label ?? "What happened") : "What’s wrong?"}
        items={level === "level2" ? level2Items : HELP_CATEGORIES}
        center={control}
        canGoBack={level === "level2"}
        busy={busy}
        onSelect={level === "level2" ? onSubtype : onCategory}
        onBack={() => {
          setLevel("level1");
          setCategoryId(null);
        }}
        onDismiss={closeMenu}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You already have an open request</DialogTitle>
            <DialogDescription>
              Start another only if this is a new situation. Otherwise return to the one that’s already live.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setConfirmOpen(false);
                setPending(null);
                if (activeIncident) {
                  void navigate({ to: "/incident/$id", params: { id: activeIncident.id } });
                }
              }}
            >
              Return to it
            </Button>
            <Button
              className="flex-1"
              disabled={busy}
              onClick={() => {
                if (pending) void submitMapping(pending);
              }}
            >
              Start another
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add details</DialogTitle>
            <DialogDescription>
              Optional. You can send without this if you need help now.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitDetails(helpType, description, canPay);
            }}
          >
            {!user ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="First name is enough"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>What do you need</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {SPECIFIC_HELP_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setHelpType(t.id)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-sm",
                      helpType === t.id
                        ? "border-primary/50 bg-elevated"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <span className="block font-medium text-fg">{t.label}</span>
                    <span className="block text-xs">{t.short}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">What should helpers know</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="I fell and cannot get up. The front door is unlocked."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lang">Your language</Label>
              <select
                id="lang"
                className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-elevated px-3 py-2.5">
              <span className="text-sm">I can pay for help</span>
              <Switch checked={canPay} onCheckedChange={setCanPay} />
            </label>

            <Button type="submit" className="h-12 w-full" disabled={busy || !hasFix}>
              {busy ? "Sending…" : "Send for help"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
