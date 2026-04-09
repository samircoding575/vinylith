import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { lateFees } from "@/server/db/schema";
import { stripe } from "@/server/stripe";
import { env } from "@/env";

export async function POST(req: NextRequest) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const feeId = session.metadata?.feeId;

    if (feeId && session.payment_status === "paid") {
      await db
        .update(lateFees)
        .set({
          paidAt: new Date(),
          stripePaymentIntentId: session.payment_intent as string,
        })
        .where(eq(lateFees.id, feeId));
    }
  }

  return NextResponse.json({ received: true });
}

// In Next.js App Router, the raw body is always available via req.text() — no config needed.
