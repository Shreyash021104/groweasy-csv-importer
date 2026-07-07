import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { CsvParseError } from "../services/csv.js";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found." });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next: NextFunction) => {
  if (res.headersSent) {
    // We already started streaming a response body; close the stream instead
    // of trying to send a fresh JSON error (which would corrupt the NDJSON output).
    res.end(JSON.stringify({ type: "error", message: toMessage(err) }) + "\n");
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof CsvParseError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof MulterError) {
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error." });
};

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Internal server error.";
}
