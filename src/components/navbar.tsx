"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export function Navbar() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const isLibrarian =
    session?.user?.role === "librarian" || session?.user?.role === "admin";
  const isAdmin = session?.user?.role === "admin";

  const links = [
    { href: "/items", label: "Catalog" },
    { href: "/search", label: "AI Search" },
    ...(session ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...(isLibrarian ? [{ href: "/items/new", label: "Add item" }] : []),
    ...(isAdmin
      ? [
          { href: "/admin/settings", label: "⚙ Settings" },
          { href: "/admin/users", label: "Users" },
        ]
      : []),
  ];

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/70 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold"
          onClick={() => setOpen(false)}
        >
          <span className="inline-block h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-rose-500" />
          <span className="tracking-tight">Vinylith</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-amber-600 transition"
            >
              {l.label}
            </Link>
          ))}
          {status === "loading" ? null : session ? (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-1.5 hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 -mr-2"
          aria-label="Toggle menu"
        >
          <div className="w-5 flex flex-col gap-1">
            <span
              className={`h-0.5 bg-current transition ${
                open ? "rotate-45 translate-y-1.5" : ""
              }`}
            />
            <span
              className={`h-0.5 bg-current transition ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`h-0.5 bg-current transition ${
                open ? "-rotate-45 -translate-y-1.5" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="px-4 py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                {l.label}
              </Link>
            ))}
            {session ? (
              <button
                onClick={() => {
                  setOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="text-left px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 text-center"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
