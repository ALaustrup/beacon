import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listChat, postChat } from "@/lib/server/chat";
import { translateMany } from "@/lib/server/translate";
import type { ChatMessage } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function ThreadChat({
  incidentId,
  actorName,
  authorId,
  language,
  hideHeading,
}: {
  incidentId: string;
  actorName: string;
  authorId: string | null;
  language: string;
  hideHeading?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const bottom = useRef<HTMLDivElement>(null);

  async function refresh() {
    const rows = await listChat({ data: { incidentId } });
    setMessages(rows);
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 3500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

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
          channel: "incident",
          incidentId,
          authorId,
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

  return (
    <section className="space-y-3">
      {hideHeading ? null : <h2 className="font-display text-lg">Signal thread</h2>}
      <div className="flex min-h-48 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Coordinate here. Messages auto-translate into your language.
            </p>
          ) : (
            messages.map((m) => (
              <article key={m.id}>
                <p className="text-xs text-subtle">
                  {m.authorName} · {m.lang.toUpperCase()} · {timeAgo(m.createdAt)}
                </p>
                {translated[m.id] && translated[m.id] !== m.body ? (
                  <>
                    <p className="text-sm leading-relaxed">{translated[m.id]}</p>
                    <p className="text-xs text-muted-foreground">{m.body}</p>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed">{m.body}</p>
                )}
              </article>
            ))
          )}
          <div ref={bottom} />
        </div>
        <form onSubmit={(e) => void send(e)} className="flex gap-2 border-t border-border p-2">
          <Input
            id="incident-message-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Update the people helping…"
          />
          <Button type="submit" disabled={busy} size="sm">
            Send
          </Button>
        </form>
      </div>
    </section>
  );
}
