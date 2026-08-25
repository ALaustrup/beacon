import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import type { HelpCategoryDef, HelpSubtypeDef } from "@/lib/help-taxonomy";
import { HELP_ICONS } from "@/components/help-icons";
import { cn } from "@/lib/utils";

export type RadialNode = Pick<HelpCategoryDef, "id" | "label" | "icon"> | HelpSubtypeDef;

type Props = {
  open: boolean;
  title: string;
  items: readonly RadialNode[];
  center: React.ReactNode;
  canGoBack: boolean;
  busy?: boolean;
  onSelect: (id: string) => void;
  onBack: () => void;
  onDismiss: () => void;
};

function useCompactLayout() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const sync = () => {
      setCompact(window.innerWidth < 780 || window.innerHeight < 740);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  return compact;
}

export function RadialSelector({
  open,
  title,
  items,
  center,
  canGoBack,
  busy,
  onSelect,
  onBack,
  onDismiss,
}: Props) {
  const compact = useCompactLayout();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const root = rootRef.current;
    const first = root?.querySelector<HTMLElement>("[data-radial-item], [data-radial-center] button, [data-radial-center]");
    first?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (canGoBack) onBack();
        else onDismiss();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const focusable = [
        ...root.querySelectorAll<HTMLElement>("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"),
      ].filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const firstEl = focusable[0]!;
      const lastEl = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, canGoBack, onBack, onDismiss, items]);

  const placed = useMemo(() => {
    const count = items.length;
    return items.map((item, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
      return { item, angle, index };
    });
  }, [items]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className="help-radial-root fixed inset-0 z-50 flex flex-col bg-bg/88 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby={panelId}
    >
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        {canGoBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-full px-3 text-sm text-fg hover:bg-elevated focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        ) : (
          <span className="min-w-11" />
        )}
        <p id={panelId} className="font-display text-base tracking-tight">
          {title}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-elevated hover:text-fg focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label="Close help menu"
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onClick={onDismiss}
      >
        <div
          className={cn(
            "relative flex w-full max-w-[36rem] flex-col items-center",
            compact ? "mt-1 gap-4" : "my-auto h-[min(34rem,78dvh)] justify-center",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div data-radial-center className={cn("relative z-20", compact && "scale-[0.82]")}>
            {center}
          </div>

          {compact ? (
            <ul className="grid w-full max-w-sm grid-cols-2 gap-2 pb-4">
              {items.map((item, index) => (
                <li key={item.id} style={{ animationDelay: `${index * 30}ms` }} className="help-radial-enter">
                  <RadialChoice item={item} compact onSelect={onSelect} disabled={busy} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="pointer-events-none absolute inset-0">
              {placed.map(({ item, angle, index }) => {
                const radius = items.length > 8 ? 148 : 156;
                return (
                  <li
                    key={item.id}
                    className="help-radial-enter pointer-events-auto absolute top-1/2 left-1/2"
                    style={{
                      animationDelay: `${index * 28}ms`,
                      transform: `translate(-50%, -50%) rotate(${angle}rad) translateY(-${radius}px) rotate(${-angle}rad)`,
                    }}
                  >
                    <RadialChoice item={item} onSelect={onSelect} disabled={busy} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function RadialChoice({
  item,
  compact,
  disabled,
  onSelect,
}: {
  item: RadialNode;
  compact?: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = HELP_ICONS[item.icon];
  return (
    <button
      type="button"
      data-radial-item
      disabled={disabled}
      onClick={() => onSelect(item.id)}
      className={cn(
        "group flex items-center rounded-2xl border border-border/80 bg-surface/95 text-left shadow-[0_10px_30px_rgba(0,0,0,0.28)]",
        "transition-[transform,background-color,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:border-paper/35 hover:bg-elevated focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        "active:scale-[0.98] disabled:opacity-40",
        compact
          ? "min-h-14 w-full gap-2.5 px-3 py-2.5"
          : "h-[4.6rem] w-[7.6rem] flex-col justify-center gap-1.5 px-2 py-2",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-elevated text-paper">
        <Icon className="size-4" strokeWidth={1.7} />
      </span>
      <span
        className={cn(
          "font-medium leading-tight text-fg",
          compact ? "text-sm" : "text-center text-[0.78rem]",
        )}
      >
        {item.label}
      </span>
    </button>
  );
}
