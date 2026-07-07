import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt, type BatchRowInput } from "../prompt.js";
import { parseAiJson } from "../schema.js";
import type { AiProvider } from "../types.js";

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async extractBatch(headers: string[], rows: BatchRowInput[]) {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0,
      system: buildSystemPrompt(),
      messages: [
        { role: "user", content: buildUserPrompt(headers, rows) },
        // Prefilling the assistant turn biases Claude to respond with raw
        // JSON immediately instead of prose, without needing a JSON mode.
        { role: "assistant", content: "{" },
      ],
    });

    const block = message.content[0];
    const text = block && block.type === "text" ? block.text : "";
    return parseAiJson(`{${text}`);
  }
}
