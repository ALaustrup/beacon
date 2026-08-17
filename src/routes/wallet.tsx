import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getWallet, listDirectory, sendAid } from "@/lib/server/wallet";
import { listIncidents } from "@/lib/server/incidents";
import type { DirectoryPerson, Incident, WalletSnapshot } from "@/lib/types";
import { formatMoney, timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function WalletPage() {
  const { user, isPending } = useCurrentUserState();
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [open, setOpen] = useState<Incident[]>([]);
  const [people, setPeople] = useState<DirectoryPerson[]>([]);
  const [mode, setMode] = useState<"signal" | "person">("signal");
  const [amount, setAmount] = useState("15");
  const [target, setTarget] = useState("");
  const [personId, setPersonId] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void getWallet()
      .then(setWallet)
      .catch(() => setWallet({ balanceCents: 0, transfers: [] }));
    void listIncidents({ data: { includeResolved: false } }).then(setOpen);
    void listDirectory()
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [user]);

  if (isPending) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-xl bg-surface" />
      </AppShell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const cents = Math.round(Number(amount) * 100);
      await sendAid({
        data: {
          amountCents: cents,
          toIncidentId: mode === "signal" ? target || null : null,
          toUserId: mode === "person" ? personId.trim() || null : null,
          fromName: user?.displayName ?? "Helper",
          memo,
        },
      });
      toast.success("Aid sent.");
      setWallet(await getWallet());
      setMemo("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed.");
    } finally {
      setBusy(false);
    }
  }

  function copyId() {
    if (!user) return;
    void navigator.clipboard.writeText(user.id).then(() => {
      toast.success("Your Beacon ID is copied.");
    });
  }

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Aid wallet</h1>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Instant credit for the person on the other end of a signal — fuel, a meal,
            a ride, a night indoors. New accounts start with {formatMoney(5000)} to help.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void signOut("/")}>
          Sign out
        </Button>
      </header>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs text-subtle">Available</p>
        <p className="font-display text-4xl tabular tracking-tight">
          {wallet ? formatMoney(wallet.balanceCents) : "—"}
        </p>
        <button
          type="button"
          onClick={copyId}
          className="mt-3 text-left text-xs text-muted-foreground hover:text-fg"
        >
          Your Beacon ID · <span className="tabular">{user.id.slice(0, 12)}…</span> · tap to copy
        </button>
      </div>

      <form onSubmit={(e) => void onSend(e)} className="mt-6 space-y-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="font-display text-lg">Send aid</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("signal")}
            className={`h-9 rounded-full border px-3 text-xs ${
              mode === "signal"
                ? "border-primary/50 bg-elevated text-fg"
                : "border-border text-muted-foreground"
            }`}
          >
            To a signal
          </button>
          <button
            type="button"
            onClick={() => setMode("person")}
            className={`h-9 rounded-full border px-3 text-xs ${
              mode === "person"
                ? "border-primary/50 bg-elevated text-fg"
                : "border-border text-muted-foreground"
            }`}
          >
            To a person
          </button>
        </div>

        {mode === "signal" ? (
          <div className="space-y-1.5">
            <Label htmlFor="target">Recipient signal</Label>
            <select
              id="target"
              className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            >
              <option value="">Choose an incident</option>
              {open.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.requesterName} · {i.helpType} · {i.locationLabel}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="person">Recipient Beacon ID</Label>
            <Input
              id="person"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              placeholder="Paste their Beacon ID"
              required
            />
            {people.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {people.map((p) => (
                  <button
                    key={p.userId}
                    type="button"
                    onClick={() => setPersonId(p.userId)}
                    className="h-8 rounded-full border border-border px-3 text-xs text-muted-foreground hover:text-fg"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="amt">Amount (USD)</Label>
            <Input
              id="amt"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="memo">Note</Label>
            <Input
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="For fuel"
            />
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          Send aid
        </Button>
      </form>

      <section className="mt-6">
        <h2 className="font-display text-lg">History</h2>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
          {(wallet?.transfers ?? []).length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">No transfers yet.</li>
          ) : (
            wallet!.transfers.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p>
                    {t.fromUserId === user.id ? "Sent" : "Received"} {formatMoney(t.amountCents)}
                  </p>
                  <p className="text-xs text-subtle">
                    {t.memo || "Aid"} · {timeAgo(t.createdAt)}
                    {t.toIncidentId ? (
                      <>
                        {" · "}
                        <Link
                          to="/incident/$id"
                          params={{ id: t.toIncidentId }}
                          className="underline-offset-4 hover:underline"
                        >
                          signal
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </AppShell>
  );
}
