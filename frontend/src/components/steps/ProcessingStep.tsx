import { Loader2, Sparkles } from "lucide-react";

interface ProcessingStepProps {
  totalRows: number;
  completedBatches: number;
  totalBatches: number;
  provider?: string;
}

export function ProcessingStep({ totalRows, completedBatches, totalBatches, provider }: ProcessingStepProps) {
  const pct = totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-black/10 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-neutral-900">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-orange-400" />
      </div>

      <div className="space-y-1">
        <p className="text-base font-medium text-neutral-800 dark:text-neutral-100">
          AI is mapping your leads into GrowEasy CRM format
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {totalBatches > 0
            ? `Batch ${Math.min(completedBatches + 1, totalBatches)} of ${totalBatches} · ${totalRows.toLocaleString()} rows total`
            : `Uploading ${totalRows.toLocaleString()} rows…`}
          {provider ? ` · provider: ${provider}` : ""}
        </p>
      </div>

      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-orange-500 transition-all duration-300 ease-out"
          style={{ width: `${Math.max(pct, totalBatches > 0 ? 6 : 15)}%` }}
        />
      </div>

      <p className="text-xs text-neutral-400 dark:text-neutral-500">This can take a moment for large files — please don&apos;t close this tab.</p>
    </div>
  );
}
