"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/mock/api";
import { formatRelative } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";

export function NotificationCenter() {
  const { data, reload } = useAsync(() => api.listNotifications(), "notifications");
  const items = data ?? [];
  const unread = items.filter((item) => !item.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-medium">通知中心</div>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={async () => {
              await api.markAllNotificationsRead();
              await reload();
            }}
          >
            全部已读
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => void api.markNotificationRead(item.id)}
              className="block border-b px-3 py-2.5 last:border-0 hover:bg-muted/60"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{item.title}</p>
                {!item.read ? <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" /> : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{formatRelative(item.createdAt)}</p>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
