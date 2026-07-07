"use client";

import { useMemo, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import { StatTile } from "@/components/StatTile";
import { CRM_COLUMNS, type ImportResult } from "@/lib/types";

interface ResultsStepProps {
  result: ImportResult;
  onReset: () => void;
}

export function ResultsStep({ result, onReset }: ResultsStepProps) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  const importedRows = useMemo(
    () => result.imported.map((record) => record as unknown as Record<string, string>),
    [result.imported],
  );

  const skippedColumns = [
    { key: "row_id", label: "Row #" },
    { key: "reason", label: "Skip Reason" },
    { key: "name", label: "Name (from source)" },
    { key: "email", label: "Email (from source)" },
  ];
  const skippedRows = useMemo(
    () =>
      result.skipped.map((s) => ({
        row_id: String(s.row_id + 1),
        reason: s.reason,
        name: s.original.name ?? s.original.Name ?? s.original["Full Name"] ?? "",
        email: s.original.email ?? s.original.Email ?? "",
      })),
    [result.skipped],
  );

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "groweasy-crm-import-result.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total Rows" value={result.totalRows} />
        <StatTile label="Imported" value={result.totalImported} tone="success" />
        <StatTile label="Skipped" value={result.totalSkipped} tone="warning" />
        <StatTile
          label="Success Rate"
          value={result.totalRows > 0 ? Math.round((result.totalImported / result.totalRows) * 100) : 0}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => setTab("imported")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "imported"
                ? "bg-orange-500 text-white"
                : "text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5"
            }`}
          >
            Imported ({result.totalImported})
          </button>
          <button
            type="button"
            onClick={() => setTab("skipped")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "skipped"
                ? "bg-orange-500 text-white"
                : "text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5"
            }`}
          >
            Skipped ({result.totalSkipped})
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-black/5 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-white/5"
          >
            <Download className="h-4 w-4" />
            Download JSON
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <RotateCcw className="h-4 w-4" />
            Import Another File
          </button>
        </div>
      </div>

      {tab === "imported" ? (
        <DataTable columns={CRM_COLUMNS as unknown as { key: string; label: string }[]} rows={importedRows} maxHeight="440px" emptyMessage="No records were imported." />
      ) : (
        <DataTable columns={skippedColumns} rows={skippedRows} maxHeight="440px" emptyMessage="No rows were skipped." />
      )}
    </div>
  );
}
