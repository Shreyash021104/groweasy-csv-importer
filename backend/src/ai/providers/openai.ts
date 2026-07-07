import OpenAI from "openai";
import { buildSystemPrompt, buildUserPrompt, type BatchRowInput } from "../prompt.js";
import { parseAiJson } from "../schema.js";
import type { AiProvider } from "../types.js";

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
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
