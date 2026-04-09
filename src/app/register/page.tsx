"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { toast } from "sonner";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const register = api.users.register.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => toast.error(e.message || "Registration failed"),
  });

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-6 py-20 text-center">
        <div className="text-5xl mb-4">📬</div>
        <h1 className="text-2xl font-bold tracking-tight">Account created!</h1>
        <p className="text-neutral-500 mt-3">
          Your membership is <span className="font-medium text-amber-600 dark:text-amber-400">pending approval</span>.
          An admin will review and activate your account shortly.
          You&apos;ll be able to sign in once approved.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 font-medium"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          register.mutate({ name, email, password });
        }}
        className="mt-8 space-y-4"
      >
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
        />
        {register.error && (
          <div className="text-sm text-rose-600">{register.error.message}</div>
        )}
        <button
          disabled={register.isPending}
          className="w-full rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 font-medium disabled:opacity-50"
        >
          {register.isPending ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
