import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/trpc";
import { borrowings, items } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

const DEFAULT_BORROW_DAYS = 14;

export const borrowingsRouter = createTRPCRouter({
  myBorrowings: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        borrowing: borrowings,
        item: items,
      })
      .from(borrowings)
      .innerJoin(items, eq(borrowings.itemId, items.id))
      .where(eq(borrowings.userId, ctx.session.user.id as string))
      .orderBy(desc(borrowings.borrowedAt));
  }),

  availability: publicProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [active] = await ctx.db
        .select()
        .from(borrowings)
        .where(
          and(
            eq(borrowings.itemId, input.itemId),
            isNull(borrowings.returnedAt)
          )
        )
        .limit(1);
      return { available: !active, borrowing: active ?? null };
    }),

  checkout: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(borrowings)
        .where(
          and(
            eq(borrowings.itemId, input.itemId),
            isNull(borrowings.returnedAt)
          )
        )
        .limit(1);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Item is already checked out",
        });
      }
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + DEFAULT_BORROW_DAYS);
      const [created] = await ctx.db
        .insert(borrowings)
        .values({
          itemId: input.itemId,
          userId: ctx.session.user.id as string,
          dueAt,
        })
        .returning();
      return created;
    }),

  returnItem: protectedProcedure
    .input(z.object({ borrowingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(borrowings)
        .set({ returnedAt: new Date() })
        .where(eq(borrowings.id, input.borrowingId))
        .returning();
      return updated;
    }),

  allActive: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ borrowing: borrowings, item: items })
      .from(borrowings)
      .innerJoin(items, eq(borrowings.itemId, items.id))
      .where(isNull(borrowings.returnedAt))
      .orderBy(desc(borrowings.borrowedAt));
  }),
});
