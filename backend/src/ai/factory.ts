import { AnthropicProvider } from "./providers/anthropic.js";
import { GeminiProvider } from "./providers/gemini.js";
import { HeuristicProvider } from "./providers/heuristic.js";
import { OpenAiProvider } from "./providers/openai.js";
import type { AiProvider } from "./types.js";

export function createAiProvider(): AiProvider {
  const requested = (process.env.AI_PROVIDER ?? "heuristic").toLowerCase();

  switch (requested) {
    case "openai": {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error("AI_PROVIDER=openai requires OPENAI_API_KEY to be set.");
      return new OpenAiProvider(key, process.env.OPENAI_MODEL ?? "gpt-4o-mini");
    }
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("AI_PROVIDER=gemini requires GEMINI_API_KEY to be set.");
      return new GeminiProvider(key, process.env.GEMINI_MODEL ?? "gemini-1.5-flash");
    }
    case "anthropic": {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("AI_PROVIDER=anthropic requires ANTHROPIC_API_KEY to be set.");
      return new AnthropicProvider(key, process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022");
    }
    case "heuristic":
      return new HeuristicProvider();
    default:
      throw new Error(
        `Unknown AI_PROVIDER "${requested}". Expected one of: openai, gemini, anthropic, heuristic.`,
      );
  }
}
