import type { ImportEvent } from "./types";

export function getApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured. Set it in your environment.");
  }
  return apiUrl.replace(/\/$/, "");
}

/**
 * Uploads a CSV file and streams back newline-delimited JSON progress
 * events as the backend batches rows through the AI provider.
 */
export async function importCsv(file: File, onEvent: (event: ImportEvent) => void): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${getApiUrl()}/api/leads/import`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let message = `Import failed with status ${res.status}.`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON; keep the generic message
    }
    throw new Error(message);
  }
  if (!res.body) {
    throw new Error("Streaming responses are not supported by this browser.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    onEvent(JSON.parse(trimmed) as ImportEvent);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) consumeLine(line);
  }
  consumeLine(buffer);
}
