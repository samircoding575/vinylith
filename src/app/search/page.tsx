"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/trpc/react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, isFetching } = api.search.semantic.useQuery(
    { query: submitted, limit: 15 },
    { enabled: submitted.length > 0 }
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">AI search</h1>
      <p className="text-neutral-500 mt-2">
        Try <em>&quot;jazz vinyl from the 1970s in mint condition&quot;</em> or{" "}
        <em>&quot;wooden toy for a 4 year old&quot;</em>.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
        }}
        className="mt-8 flex gap-3"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what you&rsquo;re looking for…"
          className="flex-1 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-6 py-3"
        />
        <button
          type="submit"
          className="rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 font-medium"
        >
          Search
        </button>
      </form>

      {data && (
        <div className="mt-4 text-xs text-neutral-500">
          Search mode:{" "}
          <span className="font-mono">
            {data.mode === "ai"
              ? "OpenAI embeddings"
              : data.mode === "mock"
              ? "local mock embeddings"
              : "text fallback"}
          </span>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {isFetching && <div className="text-neutral-500">Thinking…</div>}
        {data?.results.map(({ item, score }) => (
          <Link
            key={item.id}
            href={`/items/${item.id}`}
            className="flex items-center gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900 hover:shadow-md transition"
          >
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-950 dark:to-rose-950 flex items-center justify-center text-2xl shrink-0">
              {item.type === "book"
                ? "📚"
                : item.type === "vinyl"
                ? "💿"
                : item.type === "toy"
                ? "🎲"
                : "📓"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                {item.type}
              </div>
              <div className="font-medium truncate">{item.title}</div>
              <div className="text-sm text-neutral-500 truncate">
                {item.description}
              </div>
            </div>
            <div className="text-xs text-neutral-400">
              {(score * 100).toFixed(0)}%
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
