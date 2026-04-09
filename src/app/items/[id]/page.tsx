"use client";

import { use, useState } from "react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ItemDetailSkeleton } from "@/components/skeletons";

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const utils = api.useUtils();
  const { data: item, isLoading } = api.items.byId.useQuery({ id });
  const { data: availability } = api.borrowings.availability.useQuery({
    itemId: id,
  });
  const { data: history } = api.items.conditionHistory.useQuery({
    itemId: id,
  });

  const checkout = api.borrowings.checkout.useMutation({
    onSuccess: () => {
      toast.success("Checked out! See your dashboard for due date.");
      utils.borrowings.availability.invalidate({ itemId: id });
      utils.borrowings.myBorrowings.invalidate();
    },
    onError: (e) => toast.error(e.message || "Checkout failed"),
  });

  const isLibrarian =
    session?.user?.role === "librarian" || session?.user?.role === "admin";

  if (isLoading) return <ItemDetailSkeleton />;
  if (!item) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center text-neutral-500">
        Item not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-square rounded-3xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-950 flex items-center justify-center overflow-hidden border border-neutral-200 dark:border-neutral-800">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-7xl">
              {item.type === "book"
                ? "📚"
                : item.type === "vinyl"
                ? "💿"
                : item.type === "toy"
                ? "🎲"
                : "📓"}
            </span>
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            {item.type}
          </div>
          <h1 className="text-4xl font-bold tracking-tight mt-1">
            {item.title}
          </h1>
          <div className="mt-4 text-neutral-600 dark:text-neutral-400">
            {item.description || "No description."}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Detail label="Condition" value={item.condition.replace("_", " ")} />
            {Object.entries(item.attributes || {}).map(([k, v]) => (
              <Detail key={k} label={k} value={String(v)} />
            ))}
          </div>

          <div className="mt-8">
            {availability?.available ? (
              <button
                disabled={!session || checkout.isPending}
                onClick={() => checkout.mutate({ itemId: id })}
                className="rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 font-medium disabled:opacity-50"
              >
                {!session
                  ? "Sign in to borrow"
                  : checkout.isPending
                  ? "Checking out…"
                  : "Check out"}
              </button>
            ) : (
              <div className="rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-6 py-3 inline-block">
                Currently checked out
                {availability?.borrowing &&
                  ` · due ${format(
                    new Date(availability.borrowing.dueAt),
                    "MMM d, yyyy"
                  )}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {isLibrarian && <LogConditionForm itemId={id} />}

      <div className="mt-12">
        <h2 className="text-xl font-semibold">Condition history</h2>
        <div className="mt-4 space-y-2">
          {history?.length === 0 && (
            <div className="text-sm text-neutral-500">
              No condition entries yet.
            </div>
          )}
          {history?.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between bg-white dark:bg-neutral-900"
            >
              <div>
                <div className="font-medium capitalize">
                  {log.condition.replace("_", " ")}
                </div>
                {log.notes && (
                  <div className="text-sm text-neutral-500 mt-1">
                    {log.notes}
                  </div>
                )}
              </div>
              <div className="text-sm text-neutral-500">
                {format(new Date(log.loggedAt), "MMM d, yyyy")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2">
      <div className="text-xs text-neutral-500 capitalize">{label}</div>
      <div className="font-medium capitalize">{value}</div>
    </div>
  );
}

const CONDITIONS = ["mint", "near_mint", "good", "fair", "poor"] as const;

function LogConditionForm({ itemId }: { itemId: string }) {
  const utils = api.useUtils();
  const [condition, setCondition] =
    useState<(typeof CONDITIONS)[number]>("good");
  const [notes, setNotes] = useState("");
  const log = api.items.logCondition.useMutation({
    onSuccess: () => {
      toast.success("Condition logged");
      setNotes("");
      utils.items.conditionHistory.invalidate({ itemId });
      utils.items.byId.invalidate({ id: itemId });
    },
    onError: (e) => toast.error(e.message || "Failed to log condition"),
  });

  return (
    <div className="mt-12 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900">
      <h3 className="font-semibold">Log condition</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr_auto]">
        <select
          value={condition}
          onChange={(e) =>
            setCondition(e.target.value as (typeof CONDITIONS)[number])
          }
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c.replace("_", " ")}
            </option>
          ))}
        </select>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
        />
        <button
          onClick={() => log.mutate({ itemId, condition, notes })}
          disabled={log.isPending}
          className="rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 font-medium disabled:opacity-50"
        >
          Log
        </button>
      </div>
    </div>
  );
}
