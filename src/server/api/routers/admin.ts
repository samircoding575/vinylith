import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "@/server/trpc";
import { items } from "@/server/db/schema";
import { generateEmbedding } from "@/server/ai/embeddings";

const itemTypes = ["book", "toy", "notebook", "vinyl"] as const;
const conditions = ["mint", "near_mint", "good", "fair", "poor"] as const;

const importItemSchema = z.object({
  type: z.enum(itemTypes),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  condition: z.enum(conditions).default("good"),
  imageUrl: z.string().url().optional().or(z.literal("")).optional(),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

export const adminRouter = createTRPCRouter({
  // All items with full detail for the management table
  listAll: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: items.id,
        type: items.type,
        title: items.title,
        condition: items.condition,
        createdAt: items.createdAt,
        attributes: items.attributes,
      })
      .from(items)
      .orderBy(desc(items.createdAt));
  }),

  // Bulk import: validate each row, generate embeddings, insert
  bulkImport: adminProcedure
    .input(z.object({ rows: z.array(importItemSchema).min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const results = { inserted: 0, failed: 0, errors: [] as string[] };

      for (const row of input.rows) {
        try {
          const text = [
            row.type,
            row.title,
            row.description ?? "",
            ...Object.entries(row.attributes).map(([k, v]) => `${k}: ${v}`),
          ].join(" | ");

          const embedding = await generateEmbedding(text);

          await ctx.db.insert(items).values({
            type: row.type,
            title: row.title,
            description: row.description ?? null,
            condition: row.condition,
            imageUrl: row.imageUrl || null,
            attributes: row.attributes,
            embedding,
          });

          results.inserted++;
        } catch (err) {
          results.failed++;
          results.errors.push(`"${row.title}": ${(err as Error).message}`);
        }
      }

      return results;
    }),

  // Delete a single item by id
  deleteItem: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(items)
        .where(eq(items.id, input.id))
        .returning({ id: items.id, title: items.title });

      if (!deleted) {
        throw new Error("Item not found");
      }
      return { ok: true, title: deleted.title };
    }),
});
