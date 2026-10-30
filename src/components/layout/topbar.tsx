"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandSearch } from "@/components/layout/command-search";
import { NotificationCenter } from "@/components/layout/notification-center";
import { CURRENT_USER, findNavLabel } from "@/lib/nav";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { group, label } = findNavLabel(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur">
      <button type="button" className="rounded-md p-1 hover:bg-muted lg:hidden" onClick={onMenu}>
        <Menu className="size-4" />
      </button>
      <nav className="hidden min-w-0 items-center text-sm text-muted-foreground sm:flex">
        <span>{group}</span>
        <ChevronRight className="mx-1 size-3.5" />
        <span className="truncate font-medium text-foreground">{label}</span>
      </nav>
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
        <CommandSearch />
        <NotificationCenter />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted">
              <Avatar className="size-7">
                <AvatarFallback>张</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <div className="text-xs font-medium">{CURRENT_USER.name}</div>
                <div className="text-[10px] text-muted-foreground">{CURRENT_USER.role}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {CURRENT_USER.email}
              <div className="font-normal">{CURRENT_USER.department}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">系统设置</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/users">用户与权限</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
