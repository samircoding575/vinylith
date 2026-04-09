import Stripe from "stripe";
import { env } from "@/env";

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" })
  : null;

export const LATE_FEE_CENTS_PER_DAY = 25;   // $0.25/day
export const LATE_FEE_MAX_CENTS = 1000;      // $10.00 cap

/** Calculate overdue fee in cents (0 if not overdue or already returned). */
export function calcLateFee(dueAt: Date, returnedAt?: Date | null): number {
  const now = returnedAt ?? new Date();
  const msOverdue = now.getTime() - dueAt.getTime();
  if (msOverdue <= 0) return 0;
  const daysOverdue = Math.ceil(msOverdue / (1000 * 60 * 60 * 24));
  return Math.min(daysOverdue * LATE_FEE_CENTS_PER_DAY, LATE_FEE_MAX_CENTS);
}
