"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

import { Button, Card, ErrorMessage } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { qs } from "@/lib/api";

export function AiSummaryCard({ weekStart }: { weekStart: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generated on request, not on page load - it costs an API call and most
  // dashboard visits don't need it.
  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ answer: string }>(
        `/assistant/summary${qs({ week_start: weekStart })}`,
      );
      setSummary(res.answer);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not generate a summary",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="AI summary"
      description="A written read of the week, generated from submitted reports"
      actions={
        <Button variant="secondary" onClick={generate} loading={loading}>
          {summary ? (
            <>
              <RefreshCw size={14} /> Regenerate
            </>
          ) : (
            <>
              <Sparkles size={14} /> Generate
            </>
          )}
        </Button>
      }
    >
      {error && <ErrorMessage message={error} />}

      {!summary && !error && !loading && (
        <p className="text-sm text-muted">
          Generate a summary of what the team completed this week, recurring
          blockers, and how workload is distributed.
        </p>
      )}

      {summary && (
        <div className="space-y-2 whitespace-pre-wrap text-sm text-ink-soft">
          {summary}
        </div>
      )}
    </Card>
  );
}