export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 animate-pulse"
        >
          <div className="aspect-[4/3] bg-neutral-200 dark:bg-neutral-800" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ItemDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 animate-pulse">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-square rounded-3xl bg-neutral-200 dark:bg-neutral-800" />
        <div className="space-y-4">
          <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-10 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-4 w-5/6 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="grid grid-cols-2 gap-3 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-14 bg-neutral-200 dark:bg-neutral-800 rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RowListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 animate-pulse flex items-center gap-4"
        >
          <div className="h-16 w-16 rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-3 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
