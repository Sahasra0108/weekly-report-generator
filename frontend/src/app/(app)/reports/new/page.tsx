"use client";

import { useRouter } from "next/navigation";

import { ReportForm } from "@/components/reports/ReportForm";
import { PageHeader, Spinner } from "@/components/ui";
import { useMutation, useQuery } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Project, ReportDetail, ReportWrite } from "@/types";

export default function NewReportPage() {
  const router = useRouter();
  const { data: projects, loading: projectsLoading } = useQuery<Project[]>("/projects");

  const { mutate, loading, error, fieldErrors } = useMutation(
    async ({ payload, submit }: { payload: ReportWrite; submit: boolean }) => {
      const created = await api.post<ReportDetail>("/reports", payload);
      if (submit) {
        await api.post<ReportDetail>(`/reports/${created.id}/submit`);
      }
      return created;
    },
  );

  async function handle(payload: ReportWrite, submit: boolean) {
    try {
      const created = await mutate({ payload, submit });
      router.push(`/reports/${created.id}`);
    } catch {
      // useMutation surfaces the error; stay on the page.
    }
  }

  if (projectsLoading) return <Spinner label="Loading" />;

  return (
    <>
      <PageHeader
        title="New weekly report"
        description="Saved as a draft until you submit it for review"
      />
      <ReportForm
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