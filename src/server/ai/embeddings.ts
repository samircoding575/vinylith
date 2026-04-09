import OpenAI from "openai";
import { env } from "@/env";

const apiKey = env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

export const isRealEmbeddingEnabled = !!client;

/**
 * Generate an embedding vector for the given text.
 * Falls back to a deterministic hash-based pseudo-embedding if no API key is set,
 * so the app works end-to-end in development.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) return new Array(128).fill(0);

  if (client) {
    try {
      // Timeout after 8s to avoid hanging requests
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8_000);
      try {
        const res = await client.embeddings.create(
          {
            model: "text-embedding-3-small",
            input: trimmed,
          },
          { signal: controller.signal }
        );
        return res.data[0].embedding;
      } finally {
        clearTimeout(t);
      }
    } catch (err) {
      console.warn(
        "OpenAI embedding failed, falling back to deterministic mock:",
        (err as Error).message
      );
    }
  }
  return mockEmbedding(trimmed);
}

/** Deterministic bag-of-words pseudo-embedding for dev without OpenAI. */
function mockEmbedding(text: string, dim = 128): number[] {
  const vec = new Array(dim).fill(0);
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  for (const token of tokens) {
    let h = 0;
    for (let i = 0; i < token.length; i++) {
      h = (h * 31 + token.charCodeAt(i)) | 0;
    }
    vec[Math.abs(h) % dim] += 1;
  }
  // normalize
  const mag = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / mag);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    ma += a[i] * a[i];
    mb += b[i] * b[i];
  }
  const denom = Math.sqrt(ma) * Math.sqrt(mb);
  return denom === 0 ? 0 : dot / denom;
}
