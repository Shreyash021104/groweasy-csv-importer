import Papa from "papaparse";

export interface ParsedCsvPreview {
  headers: string[];
  rows: Record<string, string>[];
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function parseCsvFile(file: File): Promise<ParsedCsvPreview> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(new Error("File is larger than the 5MB limit."));
  }

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header, index) => (header && header.trim() ? header.trim() : `column_${index + 1}`),
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        if (headers.length === 0) {
          reject(new Error("Could not detect a header row in this CSV."));
          return;
        }
        if (results.data.length === 0) {
          reject(new Error("This CSV has a header row but no data rows."));
          return;
        }
        resolve({ headers, rows: results.data });
      },
      error: (err: Error) => reject(err),
    });
  });
}
