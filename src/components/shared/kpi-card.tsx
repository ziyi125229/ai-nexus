"use client";

import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatChange } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { KpiMetric } from "@/types";

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const up = metric.change >= 0;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground">
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{metric.hint}</TooltipContent>
        </Tooltip>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight">{metric.display}</div>
          <div
            className={cn(
              "mt-1 inline-flex items-center gap-1 text-xs",
              metric.positive ? "text-emerald-600" : "text-amber-600",
            )}
          >
            {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {formatChange(metric.change, metric.changeUnit)}
            <span className="text-muted-foreground">较上期</span>
          </div>
        </div>
        <Sparkline points={metric.sparkline.map((p) => p.v)} positive={metric.positive} />
      </div>
    </Card>
  );
}

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const w = 88;
  const h = 32;
  const d = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="mb-1 shrink-0 overflow-visible">
      <path d={d} fill="none" stroke={positive ? "#059669" : "#d97706"} strokeWidth="1.6" />
    </svg>
  );
}
