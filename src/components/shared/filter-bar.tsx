"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FilterBar({
  search,
  onSearch,
  placeholder = "搜索名称、ID 或标签",
  filters,
  extra,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  filters?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    options: { value: string; label: string }[];
  }[];
  extra?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="pl-8" />
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {filters?.map((filter) => (
          <Select key={filter.placeholder} value={filter.value} onValueChange={filter.onChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <div className="ml-auto">{extra}</div>
      </div>
    </div>
  );
}
