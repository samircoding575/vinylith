/**
 * Embeddings using Transformers.js (all-MiniLM-L6-v2).
 *
 * - Completely free, no API key needed
 * - Runs locally via ONNX in Node.js
 * - 384-dimensional vectors, solid semantic quality
 * - Model downloaded from HuggingFace on first use (~23 MB) and cached
 */

import type { FeatureExtractionPipeline } from "@huggingface/transformers";

export const isRealEmbeddingEnabled = true;

// Singleton — initialised once per process
let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = ".cache/transformers";
      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        dtype: "fp32",
      }) as Promise<FeatureExtractionPipeline>;
    })();
  }
  return pipelinePromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) return new Array(384).fill(0);

  try {
    const extractor = await getPipeline();
    const output = await extractor(trimmed, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array);
  } catch (err) {
    console.warn("Transformers.js failed, using mock fallback:", (err as Error).message);
    return mockEmbedding(trimmed);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, ma = 0, mb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    ma += a[i] * a[i];
    mb += b[i] * b[i];
  }
  const denom = Math.sqrt(ma) * Math.sqrt(mb);
  return denom === 0 ? 0 : dot / denom;
}

function mockEmbedding(text: string, dim = 384): number[] {
  const vec = new Array(dim).fill(0);
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  for (const token of tokens) {
    let h = 0;
    for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) | 0;
    vec[Math.abs(h) % dim] += 1;
  }
  const mag = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / mag);
}
