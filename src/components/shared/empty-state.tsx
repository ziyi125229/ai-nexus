import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title = "暂无数据",
  description = "请调整筛选条件，或新建一条记录。",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="mb-1 flex size-10 items-center justify-center rounded-md border bg-muted">
        <Inbox className="size-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-sm font-medium text-destructive">加载失败</p>
      <p className="text-xs text-muted-foreground">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="text-xs text-primary hover:underline">
          重试
        </button>
      ) : null}
    </div>
  );
}
