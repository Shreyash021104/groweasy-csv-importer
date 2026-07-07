import type { BatchRowInput } from "./prompt.js";
import type { ValidatedAiBatchResponse } from "./schema.js";

export interface AiProvider {
  readonly name: string;
  extractBatch(headers: string[], rows: BatchRowInput[]): Promise<ValidatedAiBatchResponse>;
}
