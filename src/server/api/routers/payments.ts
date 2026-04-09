import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { lateFees, borrowings } from "@/server/db/schema";
import { stripe, calcLateFee } from "@/server/stripe";
import { env } from "@/env";

const APP_URL = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const paymentsRouter = createTRPCRouter({
  /** All unpaid late fees for the current user. */
  myUnpaidFees: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ fee: lateFees, borrowing: borrowings })
      .from(lateFees)
      .innerJoin(borrowings, eq(lateFees.borrowingId, borrowings.id))
      .where(
        and(
          eq(lateFees.userId, ctx.session.user.id as string),
          isNull(lateFees.paidAt)
        )
      );
  }),

  /** Calculate and create/update a late fee record, then start Stripe checkout. */
  createCheckout: protectedProcedure
    .input(z.object({ borrowingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id as string;

      // Verify borrowing belongs to this user
      const [borrowing] = await ctx.db
        .select()
        .from(borrowings)
        .where(
          and(eq(borrowings.id, input.borrowingId), eq(borrowings.userId, userId))
        )
        .limit(1);

      if (!borrowing) throw new TRPCError({ code: "NOT_FOUND" });

      const amountCents = calcLateFee(borrowing.dueAt, borrowing.returnedAt);
      if (amountCents === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No late fee for this item." });
      }

      // Upsert fee record
      const existing = await ctx.db
        .select()
        .from(lateFees)
        .where(
          and(eq(lateFees.borrowingId, input.borrowingId), isNull(lateFees.paidAt))
        )
        .limit(1);

      let feeId: string;
      if (existing[0]) {
        await ctx.db
          .update(lateFees)
          .set({ amountCents })
          .where(eq(lateFees.id, existing[0].id));
        feeId = existing[0].id;
      } else {
        const [inserted] = await ctx.db
          .insert(lateFees)
          .values({ borrowingId: input.borrowingId, userId, amountCents })
          .returning();
        feeId = inserted.id;
      }

      // If Stripe isn't configured, return a mock URL for local dev
      if (!stripe) {
        return {
          url: `${APP_URL}/dashboard?payment=mock_success&feeId=${feeId}`,
          mock: true,
        };
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: {
                name: `Late return fee — Vinylith`,
                description: `Overdue fee for borrowed item`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: { feeId, userId },
        success_url: `${APP_URL}/dashboard?payment=success`,
        cancel_url: `${APP_URL}/dashboard?payment=cancelled`,
      });

      // Save session ID so webhook can look it up
      await ctx.db
        .update(lateFees)
        .set({ stripeSessionId: session.id })
        .where(eq(lateFees.id, feeId));

      return { url: session.url!, mock: false };
    }),
});
