"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { NAV_GROUPS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn("fixed inset-0 z-40 bg-slate-900/30 lg:hidden", open ? "block" : "hidden")}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex min-h-14 items-center justify-between gap-2 border-b px-3 py-2.5">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-semibold tracking-wide text-white">
              {BRAND.mark}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] leading-4 font-semibold tracking-tight">{BRAND.name}</div>
              <div className="mt-0.5 text-[10px] leading-3 text-muted-foreground">{BRAND.subtitle}</div>
            </div>
          </Link>
          <button type="button" className="rounded-md p-1 hover:bg-muted lg:hidden" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <div className="px-2 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-primary/8 font-medium text-primary"
                          : "text-slate-600 hover:bg-muted hover:text-slate-900",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t px-4 py-3 text-[11px] leading-4 text-muted-foreground">
          <div>{BRAND.demoLabel}</div>
          <div className="mt-0.5">{BRAND.positioning}</div>
        </div>
      </aside>
    </>
  );
}
