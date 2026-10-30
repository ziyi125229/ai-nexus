"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { hydrateFromStorage, isHydrated, subscribeHydration } from "@/mock/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ready = useSyncExternalStore(subscribeHydration, isHydrated, () => false);

  useEffect(() => {
    hydrateFromStorage();
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 py-5 lg:px-6">{ready ? children : null}</main>
      </div>
    </div>
  );
}
