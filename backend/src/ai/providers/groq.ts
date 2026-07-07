import OpenAI from "openai";
import { buildSystemPrompt, buildUserPrompt, type BatchRowInput } from "../prompt.js";
import { parseAiJson } from "../schema.js";
import type { AiProvider } from "../types.js";

/**
 * Groq exposes an OpenAI-compatible chat completions API, so we reuse the
 * OpenAI SDK pointed at Groq's base URL instead of writing a new client.
 */
export class GroqProvider implements AiProvider {
  readonly name = "groq";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
    this.model = model;
  }

  async extractBatch(headers: string[], rows: BatchRowInput[]) {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(headers, rows) },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return parseAiJson(text);
  }
}
