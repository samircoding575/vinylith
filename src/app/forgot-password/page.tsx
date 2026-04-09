"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const forgot = api.auth.forgotPassword.useMutation({
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-6 py-20 text-center">
        <div className="text-4xl mb-4">📬</div>
        <h1 className="text-2xl font-bold">Check your inbox</h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          If an account exists for <strong>{email}</strong>, we've sent a
          password reset link. It expires in 1 hour.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full border border-neutral-300 dark:border-neutral-700 px-6 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
      <p className="mt-2 text-neutral-500">
        Enter your email and we'll send you a reset link.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          forgot.mutate({ email });
        }}
        className="mt-8 space-y-4"
      >
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
        />
        {forgot.error && (
          <div className="text-sm text-rose-600">{forgot.error.message}</div>
        )}
        <button
          disabled={forgot.isPending}
          className="w-full rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 font-medium disabled:opacity-50"
        >
          {forgot.isPending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <div className="mt-4 text-sm text-center text-neutral-500">
        <Link href="/login" className="underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
