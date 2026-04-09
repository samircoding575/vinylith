"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState, useTransition } from "react";
import { api } from "@/trpc/react";
import { CardGridSkeleton } from "@/components/skeletons";

const TYPES = ["all", "book", "vinyl", "toy", "notebook"] as const;
type TypeFilter = (typeof TYPES)[number];

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <CardGridSkeleton count={8} />
        </div>
      }
    >
      <CatalogInner />
    </Suspense>
  );
}

function CatalogInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const type = (params.get("type") as TypeFilter) || "all";
  const q = params.get("q") || "";
  const [qInput, setQInput] = useState(q);

  const updateParams = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      startTransition(() => router.replace(`/items?${sp.toString()}`));
    },
    [params, router]
  );

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.items.list.useInfiniteQuery(
    {
      type: type === "all" ? undefined : type,
      q: q || undefined,
      limit: 24,
    },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialCursor: undefined,
    }
  );

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Catalog
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            {items.length} item{items.length === 1 ? "" : "s"} shown
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParams({ q: qInput || null });
          }}
          className="flex gap-2"
        >
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Quick search…"
            className="flex-1 sm:w-64 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2"
          />
          <button
            type="submit"
            className="rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium"
          >
            Go
          </button>
        </form>
      </div>

      <div className="flex gap-2 mb-6 sm:mb-8 flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => updateParams({ type: t === "all" ? null : t })}
            className={`rounded-full px-4 py-1.5 text-sm capitalize border transition ${
              type === t
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent"
                : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <CardGridSkeleton count={8} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-12 text-center text-neutral-500">
          No items match your filters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 hover:shadow-lg transition"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center text-4xl">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <TypeEmoji type={item.type} />
                  )}
                </div>
                <div className="p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">
                    {item.type}
                  </div>
                  <div className="font-medium mt-1 line-clamp-2 group-hover:text-amber-600 transition">
                    {item.title}
                  </div>
                  <div className="text-xs text-neutral-500 mt-2 capitalize">
                    Condition: {item.condition.replace("_", " ")}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-10 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-full border border-neutral-300 dark:border-neutral-700 px-6 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-50"
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TypeEmoji({ type }: { type: string }) {
  const map: Record<string, string> = {
    book: "📚",
    vinyl: "💿",
    toy: "🎲",
    notebook: "📓",
  };
  return <span>{map[type] ?? "📦"}</span>;
}
