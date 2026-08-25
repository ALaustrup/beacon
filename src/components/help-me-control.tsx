import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HOLD_MS = 900;
const CIRCUMFERENCE = 2 * Math.PI * 86;

type Mode = "request" | "resume" | "expanded";

export function HelpMeControl({
  mode,
  busy,
  disabled,
  onOpen,
  onSend,
  onResume,
}: {
  mode: Mode;
  busy: boolean;
  disabled?: boolean;
  onOpen: () => void;
  onSend: () => void;
  onResume?: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [armed, setArmed] = useState(false);
  const raf = useRef(0);
  const start = useRef(0);
  const fired = useRef(false);
  const progressRef = useRef(0);

  function cancelHold() {
    cancelAnimationFrame(raf.current);
    progressRef.current = 0;
    setProgress(0);
    setArmed(false);
  }

  function finishPointer() {
    const wasHold = fired.current;
    const p = progressRef.current;
    cancelHold();
    if (busy || disabled) return;
    if (wasHold) return;
    if (mode === "expanded") {
      void onSend();
      return;
    }
    if (mode === "resume") {
      onResume?.();
      return;
    }
    if (p < 0.18) onOpen();
  }

  function begin(event: React.PointerEvent<HTMLButtonElement>) {
    if (busy || disabled) return;
    if (event.button != null && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    fired.current = false;
    setArmed(true);
    start.current = performance.now();
    const tick = (now: number) => {
      const next = Math.min(1, (now - start.current) / HOLD_MS);
      progressRef.current = next;
      setProgress(next);
      if (next >= 1) {
        if (!fired.current) {
          fired.current = true;
          try {
            navigator.vibrate?.(35);
          } catch {
            /* optional */
          }
          void onSend();
        }
        setProgress(0);
        setArmed(false);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  const label =
    busy ? "Sending…" : armed ? "Keep holding…" : mode === "resume" ? "OPEN" : "HELP ME";

  const aria =
    mode === "expanded"
      ? "Send for help now without choosing a category"
      : mode === "resume"
        ? "Return to your open help request. Hold to start another request."
        : "Help me. Activate to choose what you need. Hold to send for help now.";

  return (
    <button
      type="button"
      disabled={busy || disabled}
      onPointerDown={begin}
      onPointerUp={finishPointer}
      onPointerCancel={cancelHold}
      onLostPointerCapture={cancelHold}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (busy || disabled) return;
        if (mode === "expanded") void onSend();
        else if (mode === "resume") onResume?.();
        else onOpen();
      }}
      className={cn(
        "help-me-button relative isolate grid size-[11.5rem] place-items-center rounded-full md:size-[13rem]",
        "select-none touch-none",
        "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-4 focus-visible:ring-offset-bg focus-visible:outline-none",
        "disabled:opacity-45",
      )}
      aria-label={aria}
      aria-busy={busy}
      aria-expanded={mode === "expanded"}
    >
      <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 184 184" aria-hidden>
        <circle
          cx="92"
          cy="92"
          r="86"
          fill="none"
          stroke="currentColor"
          className="text-bg/20"
          strokeWidth="3.5"
        />
        <circle
          cx="92"
          cy="92"
          r="86"
          fill="none"
          stroke="currentColor"
          className="text-bg origin-center -rotate-90"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <span className="relative z-10 flex flex-col items-center gap-1 px-6 text-center">
        <span className="font-display text-[1.65rem] leading-none tracking-[0.14em] md:text-[1.85rem]">
          {label}
        </span>
        {!busy && !armed ? (
          <span className="text-[0.7rem] tracking-[0.18em] text-bg/55 uppercase">
            {mode === "resume" ? "Your request" : mode === "expanded" ? "Send now" : "Tap or hold"}
          </span>
        ) : null}
      </span>
    </button>
  );
}
