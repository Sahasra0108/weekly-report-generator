"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Select,
  Spinner,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { useQuery } from "@/hooks/useApi";
import { qs } from "@/lib/api";
import { formatDate, formatWeekRange } from "@/lib/dates";
import type { Paginated, Project, ReportStatus, ReportSummary } from "@/types";

const STATUS_OPTIONS: { value: ReportStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "NEEDS_CORRECTION", label: "Needs correction" },
  { value: "APPROVED", label: "Approved" },
];

export default function ReportHistoryPage() {
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [projectId, setProjectId] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data: projects } = useQuery<Project[]>("/projects");

  const query = qs({
    page,
    page_size: 15,
    status: status || null,
    project_id: projectId || null,
  });
  const { data, loading, error } = useQuery<Paginated<ReportSummary>>(
    `/reports${query}`,
  );

  function updateFilter(fn: () => void) {
    fn();
    setPage(1); // a filter change invalidates the current page number
  }

  return (
    <>
      <PageHeader
        title="My reports"
        description="Every weekly report you've created, newest first"
        actions={
          <Link href="/reports/new">
            <Button>New report</Button>
          </Link>
        }
      />

      <Card
        title="History"
        actions={
          <div className="flex gap-2">
            <Select
              value={status}
              onChange={(e) =>
                updateFilter(() => setStatus(e.target.value as ReportStatus | ""))
              }
              className="w-44"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>

            <Select
              value={projectId}
              onChange={(e) => updateFilter(() => setProjectId(e.target.value))}
              className="w-48"
            >
              <option value="">All projects</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        {loading && <Spinner label="Loading your reports" />}
        {error && <ErrorMessage message={error} />}

        {data && data.items.length === 0 && (
          <EmptyState
            title="No reports yet"
            description={
              status || projectId
                ? "Try clearing the filters."
                : "Create your first weekly report to get started."
            }
            action={
              !status && !projectId ? (
                <Link href="/reports/new">
                  <Button>Create a report</Button>
                </Link>
              ) : undefined
            }
          />
        )}

        {data && data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Week</Th>
                  <Th>Project</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Tasks</Th>
                  <Th className="text-right">Hours</Th>
                  <Th>Blockers</Th>
                  <Th>Submitted</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <Td className="font-medium text-slate-900">
                      {formatWeekRange(report.week_start_date, report.week_end_date)}
                      {report.current_version_no > 1 && (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          v{report.current_version_no}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {report.project ? (
                        <span className="inline-flex items-center gap-1.5">
                          {report.project.color && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: report.project.color }}
                            />
                          )}
                          {report.project.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={report.status} />
                    </Td>
                    <Td className="text-right tabular-nums">{report.task_count}</Td>
                    <Td className="text-right tabular-nums">
                      {Number(report.total_hours).toFixed(1)}
                    </Td>
                    <Td>
                      {report.open_blocker_count > 0 ? (
                        <Badge tone="amber">{report.open_blocker_count} open</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="text-slate-500">
                      {report.submitted_at ? formatDate(report.submitted_at) : "—"}
                    </Td>
                    <Td className="text-right">
                      <Link
                        href={`/reports/${report.id}`}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        View
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {data.pages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Page {data.page} of {data.pages} · {data.total} reports
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}