"use client";

import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  ErrorMessage,
  Field,
  Input,
  PageHeader,
} from "@/components/ui";
import { useMutation } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";

export default function SettingsPage() {
  const { user } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const change = useMutation((payload: { current: string; next: string }) =>
    api.post("/auth/change-password", {
      current_password: payload.current,
      new_password: payload.next,
    }),
  );

  async function handleSubmit() {
    setDone(false);

    if (next !== confirm) {
      setLocalError("The two new passwords do not match");
      return;
    }
    if (next.length < 8) {
      setLocalError("New password must be at least 8 characters");
      return;
    }
    if (next === current) {
      setLocalError("The new password must be different from the current one");
      return;
    }

    setLocalError(null);
    try {
      await change.mutate({ current, next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch {
      // useMutation holds the error
    }
  }

  if (!user) return null;

  return (
    <>
      <PageHeader title="Account settings" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Your details">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{user.full_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-900">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Job title</dt>
              <dd className="text-slate-900">{user.job_title ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Role</dt>
              <dd>
                <Badge
                  tone={
                    user.role.name === "ADMIN"
                      ? "red"
                      : user.role.name === "MANAGER"
                        ? "blue"
                        : "slate"
                  }
                >
                  {user.role.name.toLowerCase()}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Member since</dt>
              <dd className="text-slate-900">{formatDate(user.created_at)}</dd>
            </div>
          </dl>

          <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
            Name, job title, and role are managed by an administrator.
          </p>
        </Card>

        <Card title="Change password">
          <div className="space-y-4">
            {(localError || change.error) && (
              <ErrorMessage message={localError ?? change.error!} />
            )}

            {done && (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Password updated.
              </div>
            )}

            <Field label="Current password" required>
              <Input
                type="password"
                value={current}
                onChange={(e) => {
                  setCurrent(e.target.value);
                  setLocalError(null);
                }}
                autoComplete="current-password"
              />
            </Field>

            <Field label="New password" required hint="At least 8 characters">
              <Input
                type="password"
                value={next}
                onChange={(e) => {
                  setNext(e.target.value);
                  setLocalError(null);
                }}
                autoComplete="new-password"
              />
            </Field>

            <Field label="Confirm new password" required>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setLocalError(null);
                }}
                autoComplete="new-password"
                invalid={Boolean(localError)}
              />
            </Field>

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                loading={change.loading}
                disabled={!current || !next || !confirm}
              >
                Update password
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}