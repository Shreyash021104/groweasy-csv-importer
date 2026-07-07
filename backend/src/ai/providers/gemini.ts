import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSystemPrompt, buildUserPrompt, type BatchRowInput } from "../prompt.js";
import { parseAiJson } from "../schema.js";
import type { AiProvider } from "../types.js";

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async extractBatch(headers: string[], rows: BatchRowInput[]) {
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: buildSystemPrompt(),
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(buildUserPrompt(headers, rows));
    const text = result.response.text();
    return parseAiJson(text);
  }
}
