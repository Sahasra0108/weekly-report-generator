"use client";

import { useState } from "react";

import { Button, Card, ErrorMessage, Field, Textarea } from "@/components/ui";
import { useMutation } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { ReportDetail, ReviewAction } from "@/types";
import { useAuth } from "@/lib/auth-context";

interface Props {
  report: ReportDetail;
  onReviewed: () => void;
}

export function ReviewPanel({ report, onReviewed }: Props) {
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [comment, setComment] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const { mutate, loading, error } = useMutation(
    (payload: { action: ReviewAction; comment: string | null }) =>
      api.post<ReportDetail>(`/reports/${report.id}/review`, payload),
  );
  const { user } = useAuth();

  if (report.status !== "SUBMITTED") {
    return (
      <Card title="Review">
        <p className="text-sm text-slate-500">
          {report.status === "APPROVED"
            ? "This report has been approved. No further action is needed."
            : report.status === "NEEDS_CORRECTION"
              ? "Changes have been requested. The report is back with its author."
              : "This report has not been submitted for review yet."}
        </p>
      </Card>
    );
  }

  async function handleSubmit() {
    if (!action) {
      setLocalError("Choose whether to approve or request changes");
      return;
    }
    if (action === "REQUESTED_CHANGES" && !comment.trim()) {
      setLocalError("Explain what needs to change before sending this back");
      return;
    }

    try {
      await mutate({ action, comment: comment.trim() || null });
      onReviewed();
    } catch {
      // useMutation holds the error
    }
  }

  if (report.author.id === user?.id) {
    return (
      <Card title="Review">
        <p className="text-sm text-muted">
          You cannot review your own report. Another manager or an admin needs
          to review this one.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Review this report"
      description={`Version ${report.current_version_no} is awaiting your decision`}
    >
      <div className="space-y-4">
        {(localError || error) && <ErrorMessage message={localError ?? error!} />}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setAction("APPROVED");
              setLocalError(null);
            }}
            className={`rounded-md border px-4 py-3 text-left transition-colors ${action === "APPROVED"
              ? "border-green-400 bg-green-50 ring-1 ring-green-300"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
          >
            <p className="text-sm font-medium text-slate-900">Approve</p>
            <p className="mt-0.5 text-xs text-slate-500">
              The report is complete. A comment is optional.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setAction("REQUESTED_CHANGES");
              setLocalError(null);
            }}
            className={`rounded-md border px-4 py-3 text-left transition-colors ${action === "REQUESTED_CHANGES"
              ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
          >
            <p className="text-sm font-medium text-slate-900">Request changes</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Send it back for correction. A comment is required.
            </p>
          </button>
        </div>

        <Field
          label="Comment"
          required={action === "REQUESTED_CHANGES"}
          hint={
            action === "REQUESTED_CHANGES"
              ? "The author sees this on their report page"
              : "Optional feedback for the author"
          }
        >
          <Textarea
            rows={3}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setLocalError(null);
            }}
            placeholder={
              action === "REQUESTED_CHANGES"
                ? "The hours breakdown doesn't add up to the total. Please correct it."
                : "Nice work this week."
            }
            invalid={Boolean(localError)}
          />
        </Field>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} loading={loading} disabled={!action}>
            {action === "REQUESTED_CHANGES" ? "Send back for correction" : "Submit review"}
          </Button>
        </div>
      </div>
    </Card>
  );
}