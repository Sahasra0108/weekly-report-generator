"use client";

import { useState } from "react";

import { ReportContent } from "@/components/reports/ReportContent";
import {
  Badge,
  Button,
  Card,
  ErrorMessage,
  Modal,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import { useQuery } from "@/hooks/useApi";
import { formatDateTime, formatWeekRange } from "@/lib/dates";
import { snapshotToReport } from "@/lib/snapshot";
import type { ReportDetail, VersionDetail } from "@/types";

/**
 * Past submitted versions of a report. Each opens as the complete report as it
 * stood at that submission, rendered with the same component as the live one.
 */
export function VersionHistory({ report }: { report: ReportDetail }) {
  const [openVersionNo, setOpenVersionNo] = useState<number | null>(null);

  // Fetched on demand - most viewers never open an old version.
  const { data: version, loading, error } = useQuery<VersionDetail>(
    openVersionNo === null
      ? null
      : `/reports/${report.id}/versions/${openVersionNo}`,
  );

  if (report.versions.length === 0) {
    return (
      <Card title="Version history">
        <p className="text-sm text-slate-500">
          This report has not been submitted yet, so there are no versions to show.
        </p>
      </Card>
    );
  }

  const versions = [...report.versions].sort((a, b) => b.version_no - a.version_no);
  const historical = version ? snapshotToReport(version, report) : null;

  return (
    <>
      <Card
        title="Version history"
        description={`${versions.length} submitted ${
          versions.length === 1 ? "version" : "versions"
        } · open any version to see the full report as it was submitted`}
      >
        <ul className="space-y-2">
          {versions.map((v) => {
            const isCurrent = v.version_no === report.current_version_no;
            const comment = report.review_comments.find((c) => c.version_id === v.id);

            return (
              <li
                key={v.id}
                className="flex items-start justify-between gap-4 rounded-md border border-slate-200 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      Version {v.version_no}
                    </span>
                    {isCurrent && <Badge tone="blue">Current</Badge>}
                  </div>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Submitted {formatDateTime(v.submitted_at)}
                  </p>

                  {comment && (
                    <p className="mt-1.5 text-xs text-slate-600">
                      <span
                        className={
                          comment.action === "APPROVED"
                            ? "font-medium text-green-700"
                            : "font-medium text-amber-700"
                        }
                      >
                        {comment.action === "APPROVED"
                          ? "Approved"
                          : "Changes requested"}
                      </span>
                      {comment.reviewer && ` by ${comment.reviewer.full_name}`}
                      {comment.comment && ` — ${comment.comment}`}
                    </p>
                  )}
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setOpenVersionNo(v.version_no)}
                >
                  View full report
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Modal
        open={openVersionNo !== null}
        onClose={() => setOpenVersionNo(null)}
        title={`Version ${openVersionNo} — ${report.author.full_name}`}
        subtitle={
          version
            ? `${formatWeekRange(
                version.snapshot.week_start_date as string,
                version.snapshot.week_end_date as string,
              )} · submitted ${formatDateTime(version.submitted_at)}`
            : undefined
        }
        headerExtra={
          openVersionNo === report.current_version_no ? (
            <Badge tone="blue">Current version</Badge>
          ) : (
            <Badge>Historical version</Badge>
          )
        }
      >
        {loading && <Spinner label="Loading version" />}
        {error && <ErrorMessage message={error} />}

        {historical && (
          <>
            <VersionReviewNote report={report} versionNo={historical.current_version_no} />
            <ReportContent report={historical} />
          </>
        )}
      </Modal>
    </>
  );
}

/** The review decision made against this specific version, if any. */
function VersionReviewNote({
  report,
  versionNo,
}: {
  report: ReportDetail;
  versionNo: number;
}) {
  const versionId = report.versions.find((v) => v.version_no === versionNo)?.id;
  const comment = report.review_comments.find((c) => c.version_id === versionId);

  if (!comment) {
    return (
      <div className="mb-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
        No review decision was recorded against this version.
      </div>
    );
  }

  const isRejection = comment.action === "REQUESTED_CHANGES";

  return (
    <div
      className={`mb-5 rounded-md border px-4 py-3 ${
        isRejection ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"
      }`}
    >
      <p
        className={`text-sm font-medium ${
          isRejection ? "text-amber-900" : "text-green-900"
        }`}
      >
        {isRejection ? "Changes were requested" : "Approved"} on this version
        {comment.reviewer && ` by ${comment.reviewer.full_name}`}
      </p>
      {comment.comment && (
        <p className={`mt-1 text-sm ${isRejection ? "text-amber-800" : "text-green-800"}`}>
          {comment.comment}
        </p>
      )}
      <p className={`mt-1.5 text-xs ${isRejection ? "text-amber-700" : "text-green-700"}`}>
        {formatDateTime(comment.created_at)}
      </p>
    </div>
  );
}