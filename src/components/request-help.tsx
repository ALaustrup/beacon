import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useClientState } from "@/lib/client-state";
import { localEmergencyLinks } from "@/lib/emergency";
import { SOS_HOLD_TYPE, SPECIFIC_HELP_TYPES, LANGUAGES } from "@/lib/help-types";
import { createIncident } from "@/lib/server/incidents";
import { lookupCity } from "@/lib/server/lookup";
import type { DeviceTelemetry } from "@/lib/types";
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
import { SosButton } from "@/components/sos-button";
import { cn } from "@/lib/utils";

type Props = {
  device: DeviceTelemetry & { locating: boolean; error: string | null };
  onCreated?: () => void;
};

export function RequestHelp({ device, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [helpType, setHelpType] = useState("medical");
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

  async function submit(type: string, desc: string, pay: boolean) {
    if (device.lat == null || device.lng == null) {
      toast.error("Need a location first. Allow GPS or enter a city.");
      return;
    }
    setBusy(true);
    try {
      recordSosConsent();
      const incident = await createIncident({
        data: {
          requesterId: user?.id ?? guestId,
          requesterName: name.trim() || "Someone nearby",
          helpType: type,
          description: desc,
          lat: device.lat,
          lng: device.lng,
          accuracyM: device.accuracyM,
          batteryPct: device.batteryPct,
          charging: device.charging,
          canPay: pay,
          language: user ? language : device.language,
        },
      });
      toast.success("Signal is live.", {
        description: "People with Beacon open nearby may see it.",
      });
      setOpen(false);
      onCreated?.();
      void navigate({ to: "/incident/$id", params: { id: incident.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the signal.");
    } finally {
      setBusy(false);
    }
  }

  async function useCity(e: React.FormEvent) {
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

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <SosButton
          busy={busy}
          disabled={!hasFix}
          onSend={() =>
            submit(SOS_HOLD_TYPE, description || "Emergency. Please send help now.", canPay)
          }
        />
        <Button
          variant="outline"
          size="lg"
          className="h-16 flex-1 rounded-xl"
          onClick={() => setOpen(true)}
        >
          Request specific help
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Sending shares your location with people who can help. Beacon is not 911.
      </p>
      <p className="text-xs text-subtle">
        {telLinks.map((link, i) => (
          <span key={link.href}>
            {i > 0 ? " · " : null}
            <a href={link.href} className="hover:text-fg hover:underline">
              {link.label}
            </a>
          </span>
        ))}
      </p>
      {!hasFix ? (
        <form onSubmit={(e) => void useCity(e)} className="space-y-2">
          <p className="text-xs text-warn">
            {device.locating ? "Finding your location…" : device.error || "Location needed."}
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
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request help</DialogTitle>
            <DialogDescription>
              The signal goes out immediately. Add only what helps a stranger assist you.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(helpType, description, canPay);
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
              {busy ? "Sending…" : "Broadcast to the network"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
