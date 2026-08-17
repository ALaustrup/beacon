import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HOLD_MS = 900;

export function SosButton({
  busy,
  disabled,
  onSend,
}: {
  busy: boolean;
  disabled?: boolean;
  onSend: () => void | Promise<void>;
}) {
  const [progress, setProgress] = useState(0);
  const [armed, setArmed] = useState(false);
  const raf = useRef(0);
  const start = useRef(0);
  const fired = useRef(false);

  function cancel() {
    cancelAnimationFrame(raf.current);
    setProgress(0);
    setArmed(false);
    fired.current = false;
  }

  function begin() {
    if (busy || disabled) return;
    fired.current = false;
    setArmed(true);
    start.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        if (!fired.current) {
          fired.current = true;
          try {
            navigator.vibrate?.(40);
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

  return (
    <button
      type="button"
      disabled={busy || disabled}
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "sos-hold relative h-16 flex-1 overflow-hidden rounded-xl bg-destructive text-base font-medium text-destructive-foreground select-none",
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        "disabled:opacity-40",
      )}
      style={{ ["--sos-p" as string]: String(progress) }}
      aria-label="Hold to send SOS"
    >
      <span
        className="sos-hold-bar pointer-events-none absolute inset-0 bg-primary/20"
        aria-hidden
      />
      <span className="relative z-10">
        {busy ? "Sending…" : armed ? "Keep holding…" : "Hold to send SOS"}
      </span>
    </button>
  );
}
