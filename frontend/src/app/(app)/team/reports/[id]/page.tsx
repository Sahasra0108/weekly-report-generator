"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ReportContent } from "@/components/reports/ReportContent";
import { ReviewPanel } from "@/components/reports/ReviewPanel";
import { VersionHistory } from "@/components/reports/VersionHistory";
import {
  ErrorMessage,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import { useQuery } from "@/hooks/useApi";
import { formatDateTime, formatWeekRange } from "@/lib/dates";
import type { ReportDetail } from "@/types";

export default function ManagerReviewPage() {
  const params = useParams<{ id: string }>();
  const { data: report, loading, error, refetch } = useQuery<ReportDetail>(
    `/reports/${params.id}`,
  );

  return (
    <ProtectedRoute require="manager">
      {loading && <Spinner label="Loading report" />}
      {error && <ErrorMessage message={error} />}

      {report && (
        <>
          <PageHeader
            title={report.author.full_name}
            description={
              <>
                {formatWeekRange(report.week_start_date, report.week_end_date)}
                {report.project && ` · ${report.project.name}`}
                {report.submitted_at &&
                  ` · submitted ${formatDateTime(report.submitted_at)}`}
              </>
            }
            actions={
              <div className="flex items-center gap-3">
                <StatusBadge status={report.status} />
                <Link
                  href={`/team/members/${report.author.id}`}
                  className="text-sm font-medium text-slate-900 hover:underline"
                >
                  View profile
                </Link>
              </div>
            }
          />

          <div className="space-y-5">
            <ReviewPanel report={report} onReviewed={refetch} />
            <ReportContent report={report} />
            <VersionHistory report={report} />
          </div>
        </>
      )}
    </ProtectedRoute>
  );
}