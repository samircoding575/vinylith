import { z } from "zod";
import { desc, ilike, or } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "@/server/trpc";
import { items } from "@/server/db/schema";
import {
  generateEmbedding,
  cosineSimilarity,
  isRealEmbeddingEnabled,
} from "@/server/ai/embeddings";
import { enforceRateLimit, getClientKey } from "@/server/rate-limit";

export const searchRouter = createTRPCRouter({
  semantic: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(300),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const ip = getClientKey(ctx.headers);
      // 30 searches per IP per minute
      enforceRateLimit(`search:${ip}`, { limit: 30, windowMs: 60 * 1000 });

      // Try semantic search first, fall back to text search on failure.
      try {
        const queryVec = await generateEmbedding(input.query);
        const all = await ctx.db.select().from(items);
        const scored = all
          .map((item) => ({
            item,
            score: item.embedding
              ? cosineSimilarity(queryVec, item.embedding as number[])
              : 0,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, input.limit);
        return { results: scored, mode: isRealEmbeddingEnabled ? "ai" : "mock" };
      } catch (err) {
        console.error("Semantic search failed, falling back to text:", err);
        const results = await ctx.db
          .select()
          .from(items)
          .where(
            or(
              ilike(items.title, `%${input.query}%`),
              ilike(items.description, `%${input.query}%`)
            )
          )
          .orderBy(desc(items.createdAt))
          .limit(input.limit);
        return {
          results: results.map((item) => ({ item, score: 0 })),
          mode: "fallback" as const,
        };
      }
    }),
});
