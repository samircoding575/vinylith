"use client";

import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { format, isPast } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { RowListSkeleton } from "@/components/skeletons";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const utils = api.useUtils();
  const { data: borrowings, isLoading } =
    api.borrowings.myBorrowings.useQuery(undefined, {
      enabled: !!session,
    });

  const returnItem = api.borrowings.returnItem.useMutation({
    onSuccess: () => {
      toast.success("Item returned — thanks!");
      utils.borrowings.myBorrowings.invalidate();
      utils.borrowings.availability.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to return item"),
  });

  if (status === "loading") {
    return <div className="p-10 text-neutral-500">Loading…</div>;
  }
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-neutral-500">Please sign in to view your dashboard.</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const active = borrowings?.filter((b) => !b.borrowing.returnedAt) ?? [];
  const past = borrowings?.filter((b) => b.borrowing.returnedAt) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome back, {session.user.name}
      </h1>
      <p className="text-neutral-500 mt-1 capitalize">
        Role: {session.user.role}
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Currently borrowed</h2>
        {isLoading && (
          <div className="mt-4">
            <RowListSkeleton count={2} />
          </div>
        )}
        {!isLoading && active.length === 0 && (
          <div className="mt-4 text-sm text-neutral-500">
            No active borrowings.{" "}
            <Link href="/items" className="underline">
              Browse catalog
            </Link>
            .
          </div>
        )}
        <div className="mt-4 grid gap-3">
          {active.map(({ borrowing, item }) => {
            const overdue = isPast(new Date(borrowing.dueAt));
            return (
              <div
                key={borrowing.id}
                className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900"
              >
                <div>
                  <Link
                    href={`/items/${item.id}`}
                    className="font-medium hover:text-amber-600"
                  >
                    {item.title}
                  </Link>
                  <div
                    className={`text-sm mt-1 ${
                      overdue ? "text-rose-600" : "text-neutral-500"
                    }`}
                  >
                    Due {format(new Date(borrowing.dueAt), "MMM d, yyyy")}
                    {overdue && " · overdue"}
                  </div>
                </div>
                <button
                  onClick={() =>
                    returnItem.mutate({ borrowingId: borrowing.id })
                  }
                  className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Return
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">History</h2>
          <div className="mt-4 space-y-2">
            {past.map(({ borrowing, item }) => (
              <div
                key={borrowing.id}
                className="flex items-center justify-between text-sm text-neutral-500 px-4 py-2"
              >
                <Link href={`/items/${item.id}`} className="hover:underline">
                  {item.title}
                </Link>
                <div>
                  Returned{" "}
                  {format(new Date(borrowing.returnedAt!), "MMM d, yyyy")}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
