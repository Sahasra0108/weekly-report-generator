import { formatDateTime } from "@/lib/dates";
import type { ReportDetail } from "@/types";

/**
 * Surfaces the manager's latest review comment. The assignment requires the
 * member to see clearly why a report was sent back.
 */
export function ReviewNotice({ report }: { report: ReportDetail }) {
  const latest = [...report.review_comments]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .at(0);

  if (!latest) return null;

  const isRejection = latest.action === "REQUESTED_CHANGES";

  return (
    <div
      className={`rounded-md border px-4 py-3 ${
        isRejection
          ? "border-amber-200 bg-amber-50"
          : "border-green-200 bg-green-50"
      }`}
    >
      <p
        className={`text-sm font-medium ${
          isRejection ? "text-amber-900" : "text-green-900"
        }`}
      >
        {isRejection ? "Changes requested" : "Approved"}
        {latest.reviewer && ` by ${latest.reviewer.full_name}`}
      </p>
      {latest.comment && (
        <p
          className={`mt-1 text-sm ${
            isRejection ? "text-amber-800" : "text-green-800"
          }`}
        >
          {latest.comment}
        </p>
      )}
      <p
        className={`mt-1.5 text-xs ${
          isRejection ? "text-amber-700" : "text-green-700"
        }`}
      >
        {formatDateTime(latest.created_at)}
        {latest.version_id && ` · on version ${
          report.versions.find((v) => v.id === latest.version_id)?.version_no ?? "?"
        }`}
      </p>
    </div>
  );
}