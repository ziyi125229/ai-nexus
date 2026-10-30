"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/mock/api";

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Awaited<ReturnType<typeof api.searchAll>>>([]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void api.searchAll(query).then(setHits);
    }, 160);
    return () => window.clearTimeout(handle);
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-md items-center gap-2 rounded-md border bg-white px-2.5 text-sm text-muted-foreground hover:bg-muted/40"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">搜索模型、应用、Agent、用户</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>全局搜索</DialogTitle>
            <DialogDescription>搜索平台资产</DialogDescription>
          </DialogHeader>
          <div className="border-b p-3">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入名称、模型 ID 或邮箱"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {hits.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                {query ? "没有匹配结果" : "试试「Nova」「法务」或「DeepSeek V4」"}
              </p>
            ) : (
              hits.map((hit) => (
                <button
                  key={`${hit.kind}-${hit.href}-${hit.title}`}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    setOpen(false);
                    router.push(hit.href);
                  }}
                >
                  <div>
                    <div className="text-sm font-medium">{hit.title}</div>
                    <div className="text-xs text-muted-foreground">{hit.subtitle}</div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{hit.kind}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
