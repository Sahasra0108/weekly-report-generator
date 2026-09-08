"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, ErrorMessage, Field, Input, PasswordInput, Spinner } from "@/components/ui";
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
    } catch {
    }
  }

  if (authLoading) return <Spinner label="Checking your session" />;

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Sign in to submit or review this week&apos;s reports
        </p>
      </div>

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
          <PasswordInput
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

      <p className="mt-6 text-sm text-muted">
        No account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary-text hover:underline"
        >
          Create one
        </Link>
      </p>
    </>
  );
}