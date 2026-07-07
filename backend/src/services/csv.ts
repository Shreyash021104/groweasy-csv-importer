import { parse } from "csv-parse/sync";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export class CsvParseError extends Error {}

/**
 * Parses raw CSV text into headers + row objects.
 * Trims a UTF-8 BOM (common in Excel exports) and tolerates ragged rows
 * (short rows are padded, long rows are truncated) instead of throwing,
 * since real-world exports are rarely perfectly rectangular.
 */
export function parseCsv(raw: string): ParsedCsv {
  const cleaned = raw.replace(/^﻿/, "").trim();
  if (!cleaned) {
    throw new CsvParseError("The CSV file is empty.");
  }

  let records: string[][];
  try {
    records = parse(cleaned, {
      bom: true,
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: true,
      trim: true,
    }) as string[][];
  } catch (err) {
    throw new CsvParseError(
      `Could not parse CSV: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  if (records.length === 0) {
    throw new CsvParseError("The CSV file has no rows.");
  }

  const headerRow = records[0] ?? [];
  const headers = headerRow.map((h, i) => (h && h.trim() ? h.trim() : `column_${i + 1}`));
  if (headers.length === 0) {
    throw new CsvParseError("The CSV file has no header row.");
  }

  const rows: Record<string, string>[] = [];
  for (const record of records.slice(1)) {
    if (record.every((cell) => !cell || !cell.trim())) continue; // skip blank rows
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = record[i] ?? "";
    });
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new CsvParseError("The CSV file has a header row but no data rows.");
  }

  return { headers, rows };
}
