"use client";

import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { format, isPast } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { RowListSkeleton } from "@/components/skeletons";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

// ─── Payment toast from redirect ─────────────────────────────────────────────
function PaymentToast() {
  const params = useSearchParams();
  useEffect(() => {
    const p = params.get("payment");
    if (p === "success" || p === "mock_success") toast.success("Payment successful — fee cleared!");
    if (p === "cancelled") toast.info("Payment cancelled.");
  }, [params]);
  return null;
}

// ─── Late fee badge ────────────────────────────────────────────────────────────
function FeeBadge({ cents, borrowingId }: { cents: number; borrowingId: string }) {
  const utils = api.useUtils();
  const checkout = api.payments.createCheckout.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (e) => toast.error(e.message || "Could not start payment"),
  });

  if (cents <= 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-3 py-1 text-xs font-medium">
        Late fee: ${(cents / 100).toFixed(2)}
      </span>
      <button
        onClick={() => checkout.mutate({ borrowingId })}
        disabled={checkout.isPending}
        className="rounded-full bg-rose-600 text-white px-3 py-1 text-xs font-medium hover:bg-rose-700 disabled:opacity-50"
      >
        {checkout.isPending ? "Loading…" : "Pay now"}
      </button>
    </div>
  );
}

// ─── Dashboard inner ──────────────────────────────────────────────────────────
function DashboardInner() {
  const { data: session, status } = useSession();
  const utils = api.useUtils();

  const { data: borrowings, isLoading } = api.borrowings.myBorrowings.useQuery(
    undefined,
    { enabled: !!session }
  );

  const returnItem = api.borrowings.returnItem.useMutation({
    onSuccess: (res) => {
      if (res.lateFee) {
        toast.warning(
          `Item returned. A late fee of $${(res.lateFee / 100).toFixed(2)} has been added to your account.`
        );
      } else {
        toast.success("Item returned — thanks!");
      }
      utils.borrowings.myBorrowings.invalidate();
      utils.borrowings.availability.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to return item"),
  });

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        <RowListSkeleton count={3} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-neutral-500">Please sign in to view your dashboard.</p>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3">
          Sign in
        </Link>
      </div>
    );
  }

  const active = borrowings?.filter((b) => !b.borrowing.returnedAt) ?? [];
  const past = borrowings?.filter((b) => b.borrowing.returnedAt) ?? [];
  const totalUnpaidCents = active.reduce((sum, b) => sum + (b.unpaidFeeCents ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-neutral-500 mt-1 capitalize text-sm">
            Role: {session.user.role}
          </p>
        </div>
        {totalUnpaidCents > 0 && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-5 py-4">
            <div className="text-sm font-semibold text-rose-700 dark:text-rose-300">
              Outstanding balance
            </div>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
              ${(totalUnpaidCents / 100).toFixed(2)}
            </div>
            <div className="text-xs text-rose-600 dark:text-rose-400 mt-1">
              Pay individual fees below to resume borrowing
            </div>
          </div>
        )}
      </div>

      {/* Active borrowings */}
      <section>
        <h2 className="text-xl font-semibold">Currently borrowed</h2>
        {isLoading && <div className="mt-4"><RowListSkeleton count={2} /></div>}
        {!isLoading && active.length === 0 && (
          <div className="mt-4 text-sm text-neutral-500">
            Nothing checked out.{" "}
            <Link href="/items" className="underline">Browse catalog</Link>.
          </div>
        )}
        <div className="mt-4 grid gap-3">
          {active.map(({ borrowing, item, unpaidFeeCents }) => {
            const overdue = isPast(new Date(borrowing.dueAt));
            const feeCents = unpaidFeeCents ?? 0;
            return (
              <div
                key={borrowing.id}
                className={`rounded-2xl border p-4 bg-white dark:bg-neutral-900 ${
                  overdue
                    ? "border-rose-200 dark:border-rose-800"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <Link href={`/items/${item.id}`} className="font-medium hover:text-amber-600">
                      {item.title}
                    </Link>
                    <div className={`text-sm mt-1 ${overdue ? "text-rose-600" : "text-neutral-500"}`}>
                      Due {format(new Date(borrowing.dueAt), "MMM d, yyyy")}
                      {overdue && " · overdue"}
                    </div>
                    {feeCents > 0 && (
                      <div className="mt-2">
                        <FeeBadge cents={feeCents} borrowingId={borrowing.id} />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => returnItem.mutate({ borrowingId: borrowing.id })}
                    disabled={returnItem.isPending}
                    className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 shrink-0"
                  >
                    Return
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Borrowing history */}
      {past.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">History</h2>
          <div className="mt-4 space-y-2">
            {past.map(({ borrowing, item, unpaidFeeCents }) => (
              <div
                key={borrowing.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm px-4 py-3 rounded-xl border border-neutral-100 dark:border-neutral-800"
              >
                <Link href={`/items/${item.id}`} className="hover:underline font-medium">
                  {item.title}
                </Link>
                <div className="flex items-center gap-3 text-neutral-500">
                  {(unpaidFeeCents ?? 0) > 0 && (
                    <FeeBadge cents={unpaidFeeCents!} borrowingId={borrowing.id} />
                  )}
                  <span>
                    Returned {format(new Date(borrowing.returnedAt!), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <PaymentToast />
      <DashboardInner />
    </Suspense>
  );
}
