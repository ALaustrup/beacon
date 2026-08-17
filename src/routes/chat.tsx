import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useActorName, useClientState } from "@/lib/client-state";
import { LANGUAGES } from "@/lib/help-types";
import { listChat, postChat } from "@/lib/server/chat";
import { translateMany } from "@/lib/server/translate";
import type { ChatMessage } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/chat")({ component: ChatPage });

function ChatPage() {
  const user = useCurrentUser();
  const guestId = useClientState((s) => s.guestId);
  const language = useClientState((s) => s.language);
  const setLanguage = useClientState((s) => s.setLanguage);
  const displayName = useClientState((s) => s.displayName);
  const setDisplayName = useClientState((s) => s.setDisplayName);
  const actorName = useActorName(user?.displayName);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const bottom = useRef<HTMLDivElement>(null);

  async function refresh() {
    const rows = await listChat({ data: { channel: "world" } });
    setMessages(rows);
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 3500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const needed = messages.filter((m) => m.lang !== language && !translated[m.id]);
    if (needed.length === 0) return;
    let cancelled = false;
    void translateMany({
      data: {
        targetLang: language,
        items: needed.map((m) => ({ id: m.id, text: m.body, sourceLang: m.lang })),
      },
    }).then((res) => {
      if (cancelled || !res.ok) return;
      setTranslated((prev) => ({ ...prev, ...res.translations }));
    });
    return () => {
      cancelled = true;
    };
  }, [language, messages, translated]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await postChat({
        data: {
          channel: "world",
          authorId: user?.id ?? guestId,
          authorName: actorName,
          lang: language,
          body: draft,
        },
      });
      setDraft("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }

  const autoLangs = useMemo(() => new Set(messages.map((m) => m.lang)), [messages]);

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <header className="space-y-2">
          <h1 className="font-display text-3xl tracking-tight">World chat</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Ask how to help. Incoming messages translate automatically into the language
            you read. Write in whatever language you have.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!user ? (
              <Input
                className="max-w-48"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            ) : null}
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Read in
              <select
                className="h-9 rounded-md border border-border bg-elevated px-2 text-sm text-fg"
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setTranslated({});
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-subtle">{autoLangs.size} languages in this thread</p>
          </div>
        </header>

        <div className="flex min-h-80 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => (
              <article key={m.id} className="max-w-xl">
                <p className="text-xs text-subtle">
                  {m.authorName} · {m.lang.toUpperCase()} · {timeAgo(m.createdAt)}
                </p>
                {translated[m.id] && translated[m.id] !== m.body ? (
                  <>
                    <p className="text-sm leading-relaxed">{translated[m.id]}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{m.body}</p>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed">{m.body}</p>
                )}
              </article>
            ))}
            <div ref={bottom} />
          </div>
          <form onSubmit={(e) => void send(e)} className="flex gap-2 border-t border-border p-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="How can we help from here?"
            />
            <Button type="submit" disabled={busy}>
              Send
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
