"use client";
// react-compiler: tanstack/react-virtual returns functions that must not be
// memoized across renders, so this component opts out of the compiler.
"use no memo";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export interface DataTableColumn {
  key: string;
  label: string;
}

interface DataTableProps {
  columns: DataTableColumn[];
  rows: Record<string, string | undefined>[];
  maxHeight?: string;
  emptyMessage?: string;
  rowClassName?: (row: Record<string, string | undefined>, index: number) => string;
}

/**
 * Div-based (not <table>) grid so row virtualization works with absolute
 * positioning. Sticky header + independent horizontal/vertical scroll so it
 * behaves with wide, tall CSVs (Facebook/Google exports commonly have 20+
 * columns and thousands of rows).
 */
export function DataTable({
  columns,
  rows,
  maxHeight = "480px",
  emptyMessage = "No rows to display.",
  rowClassName,
}: DataTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  const columnWidth = 180;
  const minWidth = Math.max(columns.length * columnWidth, 640);

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900">
      <div ref={parentRef} className="overflow-auto" style={{ maxHeight }}>
        <div style={{ minWidth }}>
          <div className="sticky top-0 z-10 flex border-b border-black/10 bg-neutral-50 dark:border-white/10 dark:bg-neutral-800">
            {columns.map((col) => (
              <div
                key={col.key}
                style={{ width: columnWidth, minWidth: columnWidth }}
                className="truncate px-4 py-2.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400"
              >
                {col.label}
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-neutral-500">{emptyMessage}</div>
          ) : (
            <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;
                return (
                  <div
                    key={virtualRow.key}
                    className={`absolute top-0 left-0 flex w-full border-b border-black/5 hover:bg-orange-50/60 dark:border-white/5 dark:hover:bg-white/5 ${
                      rowClassName?.(row, virtualRow.index) ?? ""
                    }`}
                    style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
                  >
                    {columns.map((col) => (
                      <div
                        key={col.key}
                        style={{ width: columnWidth, minWidth: columnWidth }}
                        className="truncate px-4 py-2.5 text-sm text-neutral-800 dark:text-neutral-200"
                        title={row[col.key] ?? ""}
                      >
                        {row[col.key] ? row[col.key] : <span className="text-neutral-400 dark:text-neutral-600">—</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
