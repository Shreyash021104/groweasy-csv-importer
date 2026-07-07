import pLimit from "p-limit";
import type { AiProvider } from "../ai/types.js";
import type { BatchRowInput } from "../ai/prompt.js";
import type { ImportResult, SkippedRecord, CrmRecord } from "../types/crm.js";
import { hasContactInfo, normalizeRecord } from "./normalize.js";

export interface RunImportOptions {
  headers: string[];
  rows: Record<string, string>[];
  provider: AiProvider;
  batchSize: number;
  concurrency: number;
  retries: number;
  onProgress?: (info: { completedBatches: number; totalBatches: number }) => void;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function withRetries<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const backoffMs = 500 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }
  throw lastErr;
}

export async function runImport(options: RunImportOptions): Promise<ImportResult> {
  const { headers, rows, provider, batchSize, concurrency, retries, onProgress } = options;

  const indexedRows: BatchRowInput[] = rows.map((data, i) => ({ row_id: i, data }));
  const originalByRowId = new Map(indexedRows.map((r) => [r.row_id, r.data]));
  const batches = chunk(indexedRows, Math.max(1, batchSize));

  const imported: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];
  let completedBatches = 0;

  const limit = pLimit(Math.max(1, concurrency));

  await Promise.all(
    batches.map((batch) =>
      limit(async () => {
        try {
          const response = await withRetries(() => provider.extractBatch(headers, batch), retries);
          const seen = new Set<number>();

          for (const result of response.results) {
            seen.add(result.row_id);
            const original = originalByRowId.get(result.row_id) ?? {};

            if (result.status === "skipped" || !result.record) {
              skipped.push({
                row_id: result.row_id,
                reason: result.skip_reason || "Skipped by AI: insufficient data",
                original,
              });
              continue;
            }

            const record = normalizeRecord(result.record);
            if (!hasContactInfo(record)) {
              skipped.push({
                row_id: result.row_id,
                reason: "No email or phone number found",
                original,
              });
              continue;
            }
            imported.push(record);
          }

          // Safety net: if the AI dropped a row_id entirely, don't silently lose it.
          for (const row of batch) {
            if (!seen.has(row.row_id)) {
              skipped.push({
                row_id: row.row_id,
                reason: "AI did not return a result for this row",
                original: row.data,
              });
            }
          }
        } catch (err) {
          for (const row of batch) {
            skipped.push({
              row_id: row.row_id,
              reason: `AI processing failed for this batch: ${
                err instanceof Error ? err.message : "unknown error"
              }`,
              original: row.data,
            });
          }
        } finally {
          completedBatches += 1;
          onProgress?.({ completedBatches, totalBatches: batches.length });
        }
      }),
    ),
  );

  return {
    imported,
    skipped,
    totalRows: rows.length,
    totalImported: imported.length,
    totalSkipped: skipped.length,
  };
}
