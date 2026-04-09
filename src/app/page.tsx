import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            A library of{" "}
            <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">
              curiosities.
            </span>
          </h1>
          <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400 max-w-lg">
            Books, toys, notebooks, and vintage vinyl — all in one place. Find
            anything with natural language search, track condition over time,
            and borrow with a click.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/items"
              className="rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 font-medium hover:opacity-90"
            >
              Browse catalog
            </Link>
            <Link
              href="/search"
              className="rounded-full border border-neutral-300 dark:border-neutral-700 px-6 py-3 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              Try AI search
            </Link>
          </div>
        </div>
        <div className="relative h-80 rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-amber-100 via-rose-100 to-purple-100 dark:from-amber-950 dark:via-rose-950 dark:to-purple-950">
          <div className="absolute inset-0 p-8 grid grid-cols-2 gap-4">
            {[
              { label: "Books", emoji: "📚" },
              { label: "Vinyl", emoji: "💿" },
              { label: "Toys", emoji: "🎲" },
              { label: "Notebooks", emoji: "📓" },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-2xl bg-white/60 dark:bg-black/30 backdrop-blur flex flex-col items-center justify-center text-center"
              >
                <div className="text-4xl">{c.emoji}</div>
                <div className="mt-2 text-sm font-medium">{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-24 grid md:grid-cols-3 gap-6">
        {[
          {
            title: "Natural language search",
            body: "Find a mint-condition jazz vinyl from the 70s in one query.",
          },
          {
            title: "Condition tracking",
            body: "Timeline of every wear-and-tear note on each vintage item.",
          },
          {
            title: "One-click borrowing",
            body: "Check out, see due dates, and return with a single click.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900"
          >
            <div className="font-semibold">{f.title}</div>
            <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {f.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
