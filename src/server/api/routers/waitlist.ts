import { z } from "zod";
import { and, asc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/trpc";
import { waitlist, items, users, borrowings } from "@/server/db/schema";
import { sendDueReminder } from "@/server/email";

export const waitlistRouter = createTRPCRouter({
  /** Queue for a specific item — public so item detail page can show position. */
  forItem: publicProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db
        .select({ entry: waitlist, user: { name: users.name } })
        .from(waitlist)
        .innerJoin(users, eq(waitlist.userId, users.id))
        .where(and(eq(waitlist.itemId, input.itemId), isNull(waitlist.fulfilledAt)))
        .orderBy(asc(waitlist.joinedAt));
      return entries.map((e, i) => ({ ...e.entry, userName: e.user.name, position: i + 1 }));
    }),

  /** Current user's waitlist entries with item details. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id as string;
    const all = await ctx.db
      .select({ entry: waitlist, item: items })
      .from(waitlist)
      .innerJoin(items, eq(waitlist.itemId, items.id))
      .where(and(eq(waitlist.userId, userId), isNull(waitlist.fulfilledAt)))
      .orderBy(asc(waitlist.joinedAt));

    // Compute queue position for each
    const positions = await Promise.all(
      all.map(async ({ entry }) => {
        const queue = await ctx.db
          .select()
          .from(waitlist)
          .where(and(eq(waitlist.itemId, entry.itemId), isNull(waitlist.fulfilledAt)))
          .orderBy(asc(waitlist.joinedAt));
        const pos = queue.findIndex((e) => e.userId === userId) + 1;
        return pos;
      })
    );

    return all.map(({ entry, item }, i) => ({ entry, item, position: positions[i] }));
  }),

  join: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id as string;

      // Can't join if item is currently available
      const [active] = await ctx.db
        .select()
        .from(borrowings)
        .where(and(eq(borrowings.itemId, input.itemId), isNull(borrowings.returnedAt)))
        .limit(1);
      if (!active) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Item is available — just borrow it directly." });
      }

      // Can't join twice
      const [existing] = await ctx.db
        .select()
        .from(waitlist)
        .where(
          and(
            eq(waitlist.itemId, input.itemId),
            eq(waitlist.userId, userId),
            isNull(waitlist.fulfilledAt)
          )
        )
        .limit(1);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "You're already on the waitlist for this item." });
      }

      const [entry] = await ctx.db
        .insert(waitlist)
        .values({ itemId: input.itemId, userId })
        .returning();
      return entry;
    }),

  leave: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id as string;
      await ctx.db
        .update(waitlist)
        .set({ fulfilledAt: new Date() })
        .where(
          and(
            eq(waitlist.itemId, input.itemId),
            eq(waitlist.userId, userId),
            isNull(waitlist.fulfilledAt)
          )
        );
      return { ok: true };
    }),

  /**
   * Called internally when an item is returned.
   * Notifies the first person in the queue.
   */
  notifyNext: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [next] = await ctx.db
        .select({ entry: waitlist, user: users, item: items })
        .from(waitlist)
        .innerJoin(users, eq(waitlist.userId, users.id))
        .innerJoin(items, eq(waitlist.itemId, items.id))
        .where(
          and(
            eq(waitlist.itemId, input.itemId),
            isNull(waitlist.fulfilledAt),
            isNull(waitlist.notifiedAt)
          )
        )
        .orderBy(asc(waitlist.joinedAt))
        .limit(1);

      if (!next) return { notified: false };

      await ctx.db
        .update(waitlist)
        .set({ notifiedAt: new Date() })
        .where(eq(waitlist.id, next.entry.id));

      sendDueReminder({
        to: next.user.email,
        userId: next.user.id,
        userName: next.user.name,
        itemTitle: next.item.title,
        dueAt: new Date(),
        daysLeft: 999, // repurpose: positive = "it's your turn" — template shows due reminder copy
      }).catch(console.error);

      return { notified: true, userName: next.user.name };
    }),
});
