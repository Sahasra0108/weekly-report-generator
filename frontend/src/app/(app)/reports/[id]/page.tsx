"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { ReportContent } from "@/components/reports/ReportContent";
import { ReviewNotice } from "@/components/reports/ReviewNotice";
import { VersionHistory } from "@/components/reports/VersionHistory";
import {
    Button,
    ErrorMessage,
    PageHeader,
    Spinner,
    StatusBadge,
} from "@/components/ui";
import { useMutation, useQuery } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { formatWeekRange } from "@/lib/dates";
import type { ReportDetail } from "@/types";

export default function ReportDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const { data: report, loading, error, refetch } = useQuery<ReportDetail>(
        `/reports/${params.id}`,
    );

    const submit = useMutation(() =>
        api.post<ReportDetail>(`/reports/${params.id}/submit`),
    );

    const remove = useMutation(() => api.delete(`/reports/${params.id}`));

    async function handleSubmit() {
        try {
            await submit.mutate(undefined);
            refetch();
        } catch {
            // error surfaced below
        }
    }

    async function handleDelete() {
        if (!confirm("Delete this draft? This cannot be undone.")) return;
        try {
            await remove.mutate(undefined);
            router.push("/reports");
        } catch {
            // error surfaced below
        }
    }

    if (loading) return <Spinner label="Loading report" />;
    if (error) return <ErrorMessage message={error} />;
    if (!report) return null;

    const isAuthor = report.author.id === user?.id;
    const canSubmit =
        isAuthor && (report.status === "DRAFT" || report.status === "NEEDS_CORRECTION");

    return (
        <>
            <PageHeader
                title={formatWeekRange(report.week_start_date, report.week_end_date)}
                description={
                    isAuthor
                        ? report.project?.name ?? "No project"
                        : `${report.author.full_name} · ${report.project?.name ?? "No project"}`
                }
                actions={
                    <div className="flex items-center gap-2">
                        <StatusBadge status={report.status} />
                        {report.is_editable && (
                            <Link href={`/reports/${report.id}/edit`}>
                                <Button variant="secondary">Edit</Button>
                            </Link>
                        )}
                        {canSubmit && (
                            <Button onClick={handleSubmit} loading={submit.loading}>
                                Submit for review
                            </Button>
                        )}
                        {isAuthor && report.status === "DRAFT" && (
                            <Button variant="ghost" onClick={handleDelete} loading={remove.loading}>
                                Delete
                            </Button>
                        )}
                    </div>
                }
            />

            {(submit.error || remove.error) && (
                <div className="mb-5">
                    <ErrorMessage message={submit.error ?? remove.error!} />
                </div>
            )}

            {report.review_comments.length > 0 && (
                <div className="mb-5">
                    <ReviewNotice report={report} />
                </div>
            )}

            <div className="space-y-5">
                <ReportContent report={report} />
                <VersionHistory report={report} />
            </div>
        </>
    );
}