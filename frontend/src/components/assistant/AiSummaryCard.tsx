"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

import { Button, ErrorMessage } from "@/components/ui";
import { ApiError, api, qs } from "@/lib/api";

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
    // The gradient border is a wrapper with padding; the inner panel sits on
    // top, so the gradient shows only as a 1px edge.
    <div className="rounded-xl bg-gradient-to-br from-primary via-[#8b5cf6] to-[#c4b5fd] p-px shadow-[0_2px_12px_rgb(109_40_217/0.12)]">
      <section className="relative overflow-hidden rounded-[calc(0.75rem-1px)] bg-gradient-to-br from-white via-[#faf8ff] to-[#f3efff]">
        {/* Soft bloom in the corner, clipped by the parent's overflow-hidden */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        />

        <header className="relative flex flex-wrap items-start justify-between gap-4 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#8b5cf6] text-white shadow-sm">
              <Sparkles size={17} />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-ink">
                AI summary
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                A written read of the week, generated from submitted reports
              </p>
            </div>
          </div>

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
        </header>

        <div className="relative px-5 pb-5">
          {error && <ErrorMessage message={error} />}

          {!summary && !error && !loading && (
            <p className="text-sm text-muted">
              Generate a summary of what the team completed this week, recurring
              blockers, and how workload is distributed.
            </p>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-border border-t-primary" />
              Reading this week&apos;s reports
            </div>
          )}

          {summary && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {summary}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}