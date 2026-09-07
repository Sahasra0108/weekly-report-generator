"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, ErrorMessage, Field, Input, Spinner, PasswordStrength } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "@/hooks/useApi";
import { passwordIsValid } from "@/lib/password";

interface FormState {
  full_name: string;
  email: string;
  job_title: string;
  password: string;
  confirm: string;
}

const empty: FormState = {
  full_name: "",
  email: "",
  job_title: "",
  password: "",
  confirm: "",
};

export default function RegisterPage() {
  const { register, user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(empty);
  const [localError, setLocalError] = useState<string | null>(null);

  const { mutate, loading, error, fieldErrors } = useMutation(
    (data: Omit<FormState, "confirm">) =>
      register({
        email: data.email,
        full_name: data.full_name,
        job_title: data.job_title || null,
        password: data.password,
      }),
  );

  useEffect(() => {
    if (!authLoading && user) router.replace("/reports");
  }, [authLoading, user, router]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setLocalError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!passwordIsValid(form.password, form.email)) {
      setLocalError("Your password does not meet all the requirements below");
      return;
    }
    if (form.password !== form.confirm) {
      setLocalError("The two passwords do not match");
      return;
    }

    const { confirm, ...payload } = form;
    try {
      await mutate(payload);
    } catch {
      // useMutation holds the error state.
    }
  }

  if (authLoading) return <Spinner label="Checking your session" />;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-sm font-semibold text-slate-900">Create an account</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {(localError || error) && <ErrorMessage message={localError ?? error!} />}

        <Field label="Full name" required error={fieldErrors.full_name}>
          <Input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Jane Perera"
            autoComplete="name"
            invalid={Boolean(fieldErrors.full_name)}
            required
          />
        </Field>

        <Field label="Email" required error={fieldErrors.email}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            invalid={Boolean(fieldErrors.email)}
            required
          />
        </Field>

        <Field label="Job title" error={fieldErrors.job_title}>
          <Input
            value={form.job_title}
            onChange={(e) => set("job_title", e.target.value)}
            placeholder="Software Engineer"
          />
        </Field>

        <Field label="Password" required error={fieldErrors.password}>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            autoComplete="new-password"
            invalid={Boolean(fieldErrors.password)}
            required
          />
          <PasswordStrength password={form.password} email={form.email} />
        </Field>

        <Field label="Confirm password" required>
          <Input
            type="password"
            value={form.confirm}
            onChange={(e) => set("confirm", e.target.value)}
            autoComplete="new-password"
            invalid={Boolean(localError)}
            required
          />
        </Field>

        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-slate-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}