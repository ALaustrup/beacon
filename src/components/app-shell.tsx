import { Link, useRouterState } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  Globe,
  MapPinned,
  MessageCircle,
  Radio,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { AlertListener } from "@/components/alert-listener";
import { useDevice } from "@/lib/use-device";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Live", icon: Radio },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/places", label: "Places", icon: UtensilsCrossed },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/log", label: "Log", icon: MapPinned },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const device = useDevice();

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AlertListener userLat={device.lat} userLng={device.lng} />
      <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-full border border-primary/40">
              <span className="size-1.5 rounded-full bg-primary" />
            </span>
            <span className="font-display text-lg tracking-tight">Beacon</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-elevated text-fg"
                      : "text-muted-foreground hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <AuthSlot />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-4 pb-24 md:pb-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-xs",
                    active ? "text-fg" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-8 w-20 animate-pulse rounded-full bg-elevated" />;
  }
  if (user) {
    return (
      <SignedIn>
        <Link
          to="/wallet"
          className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3 pl-1 text-sm"
        >
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt=""
              className="size-6 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-6 place-items-center rounded-full bg-elevated text-xs">
              {(user.displayName ?? "U").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="max-w-28 truncate">{user.displayName ?? "Account"}</span>
        </Link>
      </SignedIn>
    );
  }
  return (
    <SignedOut>
      <Link
        to="/login"
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
      >
        <Globe className="size-3.5" />
        Sign in to help
      </Link>
    </SignedOut>
  );
}
