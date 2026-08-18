"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BedDouble, CalendarDays, ListChecks, LogOut, Plus, Search } from "lucide-react";
import { logout } from "@/lib/auth/actions";
import type { Room } from "@/lib/domain/types";
import { useBookingDialog } from "@/components/booking/booking-dialog";
import { AvailabilitySheet } from "@/components/availability/availability-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Calendar", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", icon: ListChecks },
  { href: "/rooms", label: "Rooms", icon: BedDouble },
] as const;

export function AppNav({ rooms }: { rooms: Room[] }) {
  const pathname = usePathname();
  const { openNew } = useBookingDialog();

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:gap-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CalendarDays className="size-5" />
            </span>
            Bookit
          </Link>

          {/* Desktop links */}
          <nav className="hidden items-center gap-1.5 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-base font-semibold transition-colors hover:bg-accent",
                  pathname === link.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            {/* Desktop actions */}
            <div className="hidden items-center gap-2.5 md:flex">
              <AvailabilitySheet rooms={rooms}>
                <Button variant="outline" size="lg" className="text-base">
                  <Search className="size-5" />
                  Check availability
                </Button>
              </AvailabilitySheet>
              <Button size="lg" className="text-base" onClick={() => openNew()}>
                <Plus className="size-5" />
                New booking
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Sign out"
              onClick={() => logout()}
              className="text-muted-foreground"
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5 items-end">
          {links.slice(0, 2).map((link) => (
            <MobileTab
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={pathname === link.href}
            />
          ))}

          {/* Prominent center action */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => openNew()}
              className="-mt-6 flex flex-col items-center gap-1"
              aria-label="New booking"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95">
                <Plus className="size-8" />
              </span>
              <span className="pb-2 text-xs font-semibold text-primary">New</span>
            </button>
          </div>

          <AvailabilitySheet rooms={rooms}>
            <button
              type="button"
              className="flex flex-col items-center gap-1 py-2.5 text-muted-foreground"
            >
              <Search className="size-7" />
              <span className="text-xs font-semibold">Check dates</span>
            </button>
          </AvailabilitySheet>

          <MobileTab
            href="/rooms"
            label="Rooms"
            icon={BedDouble}
            active={pathname === "/rooms"}
          />
        </div>
      </nav>
    </>
  );
}

function MobileTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-7" />
      <span className="text-xs font-semibold">{label}</span>
    </Link>
  );
}
