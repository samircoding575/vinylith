import { z } from "zod";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/trpc";
import { borrowings, items, users, lateFees } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { sendBorrowConfirmation } from "@/server/email";
import { calcLateFee } from "@/server/stripe";

const DEFAULT_BORROW_DAYS = 14;

export const borrowingsRouter = createTRPCRouter({
  myBorrowings: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ borrowing: borrowings, item: items })
      .from(borrowings)
      .innerJoin(items, eq(borrowings.itemId, items.id))
      .where(eq(borrowings.userId, ctx.session.user.id as string))
      .orderBy(desc(borrowings.borrowedAt));

    // Attach unpaid fee amount to each row
    const feeRows = await ctx.db
      .select()
      .from(lateFees)
      .where(
        and(
          eq(lateFees.userId, ctx.session.user.id as string),
          isNull(lateFees.paidAt)
        )
      );
    const feeByBorrowing: Record<string, number> = {};
    for (const f of feeRows) feeByBorrowing[f.borrowingId] = f.amountCents;

    return rows.map(({ borrowing, item }) => ({
      borrowing,
      item,
      unpaidFeeCents: feeByBorrowing[borrowing.id] ?? calcLateFee(borrowing.dueAt, borrowing.returnedAt),
    }));
  }),

  availability: publicProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [active] = await ctx.db
        .select()
        .from(borrowings)
        .where(and(eq(borrowings.itemId, input.itemId), isNull(borrowings.returnedAt)))
        .limit(1);
      return { available: !active, borrowing: active ?? null };
    }),

  checkout: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id as string;

      // Block if user has any unpaid late fees
      const [unpaidFee] = await ctx.db
        .select()
        .from(lateFees)
        .where(and(eq(lateFees.userId, userId), isNull(lateFees.paidAt)))
        .limit(1);

      if (unpaidFee) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You have an outstanding late fee. Please settle it before borrowing again.",
        });
      }

      // Block if user has any overdue items (past due, not returned)
      const [overdueItem] = await ctx.db
        .select()
        .from(borrowings)
        .where(
          and(
            eq(borrowings.userId, userId),
            isNull(borrowings.returnedAt),
            lt(borrowings.dueAt, new Date())
          )
        )
        .limit(1);

      if (overdueItem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You have overdue items. Please return them before borrowing anything else.",
        });
      }

      // Check item availability
      const [alreadyOut] = await ctx.db
        .select()
        .from(borrowings)
        .where(and(eq(borrowings.itemId, input.itemId), isNull(borrowings.returnedAt)))
        .limit(1);

      if (alreadyOut) {
        throw new TRPCError({ code: "CONFLICT", message: "Item is already checked out" });
      }

      // Get item + user details for confirmation email
      const [item] = await ctx.db.select().from(items).where(eq(items.id, input.itemId)).limit(1);
      const [user] = await ctx.db.select().from(users).where(eq(users.id, userId)).limit(1);

      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + DEFAULT_BORROW_DAYS);

      const [created] = await ctx.db
        .insert(borrowings)
        .values({ itemId: input.itemId, userId, dueAt })
        .returning();

      // Send confirmation email (fire-and-forget — don't block checkout)
      if (user && item) {
        sendBorrowConfirmation({
          to: user.email,
          userId: user.id,
          userName: user.name,
          itemTitle: item.title,
          dueAt,
        }).catch(console.error);
      }

      return created;
    }),

  returnItem: protectedProcedure
    .input(z.object({ borrowingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id as string;

      const [borrowing] = await ctx.db
        .select()
        .from(borrowings)
        .where(and(eq(borrowings.id, input.borrowingId), eq(borrowings.userId, userId)))
        .limit(1);

      if (!borrowing) throw new TRPCError({ code: "NOT_FOUND" });

      const returnedAt = new Date();
      const [updated] = await ctx.db
        .update(borrowings)
        .set({ returnedAt })
        .where(eq(borrowings.id, input.borrowingId))
        .returning();

      // Create late fee record if overdue
      const feeCents = calcLateFee(borrowing.dueAt, returnedAt);
      if (feeCents > 0) {
        await ctx.db.insert(lateFees).values({
          borrowingId: borrowing.id,
          userId,
          amountCents: feeCents,
        });
      }

      return { ...updated, lateFee: feeCents > 0 ? feeCents : null };
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
