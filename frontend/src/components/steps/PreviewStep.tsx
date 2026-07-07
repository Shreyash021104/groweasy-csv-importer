import { FileText, X } from "lucide-react";
import { DataTable } from "@/components/DataTable";

interface PreviewStepProps {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function PreviewStep({ fileName, headers, rows, onCancel, onConfirm }: PreviewStepProps) {
  const columns = headers.map((h) => ({ key: h, label: h }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{fileName}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {rows.length.toLocaleString()} rows · {headers.length} columns detected
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-black/5 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
        >
          <X className="h-3.5 w-3.5" />
          Change file
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Preview — no AI processing has run yet
        </p>
        <DataTable columns={columns} rows={rows} maxHeight="440px" />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-black/5 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
        >
          Confirm &amp; Import with AI
        </button>
      </div>
    </div>
  );
}
