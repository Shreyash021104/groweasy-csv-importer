import { Router } from "express";
import { createAiProvider } from "../ai/factory.js";
import { HttpError } from "../middleware/error.js";
import { csvUpload } from "../middleware/upload.js";
import { parseCsv } from "../services/csv.js";
import { runImport } from "../services/importPipeline.js";

export const leadsRouter = Router();

const BATCH_SIZE = Number(process.env.AI_BATCH_SIZE ?? 25);
const CONCURRENCY = Number(process.env.AI_BATCH_CONCURRENCY ?? 3);
const RETRIES = Number(process.env.AI_BATCH_RETRIES ?? 2);

/**
 * Streams newline-delimited JSON (NDJSON) so the frontend can show live
 * batch-processing progress instead of a blind spinner. Each line is one
 * JSON object; the last line is always {"type":"result", ...}.
 */
leadsRouter.post("/import", csvUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new HttpError(400, "No CSV file was uploaded. Attach it under the 'file' field.");
    }

    const raw = req.file.buffer.toString("utf-8");
    const { headers, rows } = parseCsv(raw); // throws CsvParseError -> handled before streaming starts

    const provider = createAiProvider();

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const send = (payload: unknown) => res.write(JSON.stringify(payload) + "\n");

    send({ type: "started", totalRows: rows.length, provider: provider.name });

    const result = await runImport({
      headers,
      rows,
      provider,
      batchSize: BATCH_SIZE,
      concurrency: CONCURRENCY,
      retries: RETRIES,
      onProgress: ({ completedBatches, totalBatches }) => {
        send({ type: "progress", completedBatches, totalBatches });
      },
    });

    send({ type: "result", ...result });
    res.end();
  } catch (err) {
    next(err);
  }
});
