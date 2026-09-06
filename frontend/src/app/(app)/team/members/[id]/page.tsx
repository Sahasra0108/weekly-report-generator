"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import {
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorMessage,
    PageHeader,
    Spinner,
    StatusBadge,
    Table,
    Td,
    Th,
} from "@/components/ui";
import { useQuery } from "@/hooks/useApi";
import { qs } from "@/lib/api";
import { formatDate, formatWeekRange } from "@/lib/dates";
import type { Paginated, ReportSummary, User } from "@/types";

export default function MemberProfilePage() {
    const params = useParams<{ id: string }>();

    const { data: member, loading: memberLoading, error: memberError } =
        useQuery<User>(`/users/${params.id}`);

    const { data: reports, loading: reportsLoading } = useQuery
        <
            Paginated<ReportSummary>
        >(`/reports${qs({ user_id: params.id, page_size: 50 })}`);

    const stats = reports
        ? {
            total: reports.total,
            approved: reports.items.filter((r) => r.status === "APPROVED").length,
            pending: reports.items.filter((r) => r.status === "SUBMITTED").length,
            needsCorrection: reports.items.filter(
                (r) => r.status === "NEEDS_CORRECTION",
            ).length,
            totalHours: reports.items.reduce((s, r) => s + Number(r.total_hours), 0),
            totalTasks: reports.items.reduce((s, r) => s + r.task_count, 0),
            openBlockers: reports.items.reduce((s, r) => s + r.open_blocker_count, 0),
        }
        : null;

    return (
        <ProtectedRoute require="manager">
            {memberLoading && <Spinner label="Loading profile" />}
            {memberError && <ErrorMessage message={memberError} />}

            {member && (
                <>
                    <PageHeader
                        title={member.full_name}
                        description={`${member.job_title ?? "No job title"} · ${member.email}`}
                        actions={
                            !member.is_active ? <Badge tone="red">Deactivated</Badge> : undefined
                        }
                    />

                    {stats && (
                        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard label="Reports submitted" value={stats.total} />
                            <StatCard label="Approved" value={stats.approved} />
                            <StatCard
                                label="Awaiting review"
                                value={stats.pending}
                                tone={stats.pending > 0 ? "blue" : undefined}
                            />
                            <StatCard
                                label="Needs correction"
                                value={stats.needsCorrection}
                                tone={stats.needsCorrection > 0 ? "amber" : undefined}
                            />
                            <StatCard label="Tasks recorded" value={stats.totalTasks} />
                            <StatCard label="Hours logged" value={stats.totalHours.toFixed(1)} />
                            <StatCard
                                label="Open blockers"
                                value={stats.openBlockers}
                                tone={stats.openBlockers > 0 ? "amber" : undefined}
                            />
                        </div>
                    )}

                    <Card title="Report history">
                        {reportsLoading && <Spinner label="Loading reports" />}

                        {reports && reports.items.length === 0 && (
                            <EmptyState
                                title="No reports yet"
                                description="This team member has not submitted any reports."
                            />
                        )}

                        {reports && reports.items.length > 0 && (
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Week</Th>
                                        <Th>Project</Th>
                                        <Th>Status</Th>
                                        <Th className="text-right">Tasks</Th>
                                        <Th className="text-right">Hours</Th>
                                        <Th>Submitted</Th>
                                        <Th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.items.map((report) => (
                                        <tr key={report.id} className="hover:bg-slate-50">
                                            <Td className="font-medium text-slate-900">
                                                {formatWeekRange(
                                                    report.week_start_date,
                                                    report.week_end_date,
                                                )}
                                            </Td>
                                            <Td className="text-slate-700">
                                                {report.project?.name ?? "—"}
                                            </Td>
                                            <Td>
                                                <StatusBadge status={report.status} />
                                            </Td>
                                            <Td className="text-right tabular-nums">{report.task_count}</Td>
                                            <Td className="text-right tabular-nums">
                                                {Number(report.total_hours).toFixed(1)}
                                            </Td>
                                            <Td className="text-slate-500">
                                                {report.submitted_at ? formatDate(report.submitted_at) : "—"}
                                            </Td>
                                            <Td className="text-right">
                                                <Link
                                                    href={`/team/reports/${report.id}`}
                                                    className="text-sm font-medium text-slate-900 hover:underline"
                                                >
                                                    Open
                                                </Link>
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </Card>
                </>
            )}
        </ProtectedRoute>
    );
}

function StatCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: number | string;
    tone?: "blue" | "amber";
}) {
    const toneClasses = {
        blue: "text-blue-700",
        amber: "text-amber-700",
    };
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
            </p>
            <p
                className={`mt-1 text-2xl font-semibold tabular-nums ${tone ? toneClasses[tone] : "text-slate-900"
                    }`}
            >
                {value}
            </p>
        </div>
    );
}