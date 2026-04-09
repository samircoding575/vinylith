import { z } from "zod";
import { and, desc, eq, ilike, lt, or, SQL } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  librarianProcedure,
} from "@/server/trpc";
import { items, conditionLogs } from "@/server/db/schema";
import { generateEmbedding } from "@/server/ai/embeddings";

const itemTypes = ["book", "toy", "notebook", "vinyl"] as const;
const conditions = ["mint", "near_mint", "good", "fair", "poor"] as const;

const itemInput = z.object({
  type: z.enum(itemTypes),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  condition: z.enum(conditions).default("good"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

function buildEmbeddingText(item: {
  title: string;
  description?: string | null;
  type: string;
  attributes: Record<string, unknown>;
}) {
  const attrStr = Object.entries(item.attributes || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return `${item.type} | ${item.title} | ${item.description ?? ""} | ${attrStr}`;
}

export const itemsRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z
        .object({
          type: z.enum(itemTypes).optional(),
          q: z.string().optional(),
          limit: z.number().min(1).max(50).default(24),
          // cursor = createdAt ISO string of the last item from previous page
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 24;
      const filters: SQL[] = [];
      if (input?.type) filters.push(eq(items.type, input.type));
      if (input?.q) {
        filters.push(
          or(
            ilike(items.title, `%${input.q}%`),
            ilike(items.description, `%${input.q}%`)
          )!
        );
      }
      if (input?.cursor) {
        filters.push(lt(items.createdAt, new Date(input.cursor)));
      }
      const where = filters.length ? and(...filters) : undefined;
      const rows = await ctx.db
        .select()
        .from(items)
        .where(where)
        .orderBy(desc(items.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore
        ? page[page.length - 1].createdAt.toISOString()
        : null;
      return { items: page, nextCursor };
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(items)
        .where(eq(items.id, input.id))
        .limit(1);
      return item ?? null;
    }),

  create: librarianProcedure
    .input(itemInput)
    .mutation(async ({ ctx, input }) => {
      const embedding = await generateEmbedding(
        buildEmbeddingText(input as never)
      );
      const [created] = await ctx.db
        .insert(items)
        .values({ ...input, imageUrl: input.imageUrl || null, embedding })
        .returning();
      return created;
    }),

  update: librarianProcedure
    .input(itemInput.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const embedding = await generateEmbedding(
        buildEmbeddingText(rest as never)
      );
      const [updated] = await ctx.db
        .update(items)
        .set({
          ...rest,
          imageUrl: rest.imageUrl || null,
          embedding,
          updatedAt: new Date(),
        })
        .where(eq(items.id, id))
        .returning();
      return updated;
    }),

  delete: librarianProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(items).where(eq(items.id, input.id));
      return { ok: true };
    }),

  logCondition: librarianProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        condition: z.enum(conditions),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [log] = await ctx.db
        .insert(conditionLogs)
        .values({
          itemId: input.itemId,
          condition: input.condition,
          notes: input.notes,
          loggedBy: ctx.session.user.id as string,
        })
        .returning();
      await ctx.db
        .update(items)
        .set({ condition: input.condition, updatedAt: new Date() })
        .where(eq(items.id, input.itemId));
      return log;
    }),

  conditionHistory: publicProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(conditionLogs)
        .where(eq(conditionLogs.itemId, input.itemId))
        .orderBy(desc(conditionLogs.loggedAt));
    }),
});
