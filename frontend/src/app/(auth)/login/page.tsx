"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, ErrorMessage, Field, Input, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "@/hooks/useApi";

export default function LoginPage() {
  const { login, user, loading: authLoading, isManager } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutate, loading, error } = useMutation(
    ({ email, password }: { email: string; password: string }) =>
      login(email, password),
  );

  // Already signed in? Don't show the form again.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(isManager ? "/team" : "/reports");
    }
  }, [authLoading, user, isManager, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutate({ email, password });
      // The redirect is handled by the effect above once `user` is set.
    } catch {
      // Error state is already captured by useMutation.
    }
  }

  if (authLoading) return <Spinner label="Checking your session" />;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-sm font-semibold text-slate-900">Sign in</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorMessage message={error} />}

        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>

        <Field label="Password" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </Field>

        <Button type="submit" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        No account?{" "}
        <Link href="/register" className="font-medium text-slate-900 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}