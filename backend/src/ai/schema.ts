import { z } from "zod";

const recordSchema = z
  .object({
    created_at: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    country_code: z.string().optional(),
    mobile_without_country_code: z.string().optional(),
    company: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    lead_owner: z.string().optional(),
    crm_status: z.string().optional(),
    crm_note: z.string().optional(),
    data_source: z.string().optional(),
    possession_time: z.string().optional(),
    description: z.string().optional(),
  })
  .partial();

const rowResultSchema = z.object({
  row_id: z.coerce.number(),
  status: z.enum(["imported", "skipped"]),
  skip_reason: z.string().optional(),
  record: recordSchema.optional(),
});

export const aiBatchResponseSchema = z.object({
  results: z.array(rowResultSchema),
});

export type ValidatedAiBatchResponse = z.infer<typeof aiBatchResponseSchema>;

/**
 * Parses a raw LLM text response into a validated batch response.
 * Strips markdown code fences some models add despite instructions not to.
 */
export function parseAiJson(raw: string): ValidatedAiBatchResponse {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  const jsonSlice =
    firstBrace >= 0 && lastBrace > firstBrace ? stripped.slice(firstBrace, lastBrace + 1) : stripped;
  const parsed = JSON.parse(jsonSlice);
  return aiBatchResponseSchema.parse(parsed);
}
