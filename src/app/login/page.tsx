"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });
          setLoading(false);
          if (res?.error) setError("Invalid email or password");
          else router.push("/dashboard");
        }}
        className="mt-8 space-y-4"
      >
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
        />
        {error && <div className="text-sm text-rose-600">{error}</div>}
        <button
          disabled={loading}
          className="w-full rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 font-medium disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-6 text-sm text-neutral-500 text-center">
        No account?{" "}
        <Link href="/register" className="underline">
          Register
        </Link>
      </div>
    </div>
  );
}
