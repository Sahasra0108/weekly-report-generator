"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { ReportForm } from "@/components/reports/ReportForm";
import { ReviewNotice } from "@/components/reports/ReviewNotice";
import { Button, Card, ErrorMessage, PageHeader, Spinner } from "@/components/ui";
import { useMutation, useQuery } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { formatWeekRange } from "@/lib/dates";
import type { Project, ReportDetail, ReportWrite } from "@/types";

export default function EditReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: report, loading: reportLoading, error: reportError } =
    useQuery<ReportDetail>(`/reports/${params.id}`);
  const { data: projects, loading: projectsLoading } = useQuery<Project[]>("/projects");

  const { mutate, loading, error, fieldErrors } = useMutation(
    async ({ payload, submit }: { payload: ReportWrite; submit: boolean }) => {
      await api.put<ReportDetail>(`/reports/${params.id}`, payload);
      if (submit) {
        await api.post<ReportDetail>(`/reports/${params.id}/submit`);
      }
    },
  );

  async function handle(payload: ReportWrite, submit: boolean) {
    try {
      await mutate({ payload, submit });
      router.push(`/reports/${params.id}`);
    } catch {
      // handled by useMutation
    }
  }

  if (reportLoading || projectsLoading) return <Spinner label="Loading report" />;
  if (reportError) return <ErrorMessage message={reportError} />;
  if (!report) return null;

  if (!report.is_editable) {
    return (
      <>
        <PageHeader title="Report locked" />
        <Card>
          <p className="text-sm text-slate-600">
            This report has status{" "}
            <strong>{report.status.replace("_", " ").toLowerCase()}</strong> and can no
            longer be edited.
          </p>
          <Link href={`/reports/${report.id}`} className="mt-4 inline-block">
            <Button variant="secondary">View report</Button>
          </Link>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit report"
        description={formatWeekRange(report.week_start_date, report.week_end_date)}
      />

      {report.status === "NEEDS_CORRECTION" && (
        <div className="mb-5">
          <ReviewNotice report={report} />
        </div>
      )}

      <ReportForm
        report={report}
        projects={projects ?? []}
        onSave={(payload) => handle(payload, false)}
        onSubmitForReview={(payload) => handle(payload, true)}
        saving={loading}
        error={error}
        fieldErrors={fieldErrors}
      />
    </>
  );
}