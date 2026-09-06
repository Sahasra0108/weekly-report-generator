"use client";

import Link from "next/link";
import { useState } from "react";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
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
import { formatDate, formatWeekRange, recentWeeks } from "@/lib/dates";
import type {
  Paginated,
  Project,
  ReportStatus,
  ReportSummary,
  User,
} from "@/types";

const STATUSES: { value: ReportStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "NEEDS_CORRECTION", label: "Needs correction" },
  { value: "APPROVED", label: "Approved" },
];

export default function TeamReportsPage() {
  const [userId, setUserId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [week, setWeek] = useState("");
  const [page, setPage] = useState(1);

  const { data: users } = useQuery<User[]>("/users");
  const { data: projects } = useQuery<Project[]>("/projects");

  const query = qs({
    page,
    page_size: 20,
    user_id: userId || null,
    project_id: projectId || null,
    status: status || null,
    week_start: week || null,
  });
  const { data, loading, error } = useQuery<Paginated<ReportSummary>>(
    `/reports${query}`,
  );

  function filter(fn: () => void) {
    fn();
    setPage(1);
  }

  const hasFilters = Boolean(userId || projectId || status || week);

  return (
    <ProtectedRoute require="manager">
      <PageHeader
        title="Team reports"
        description="Every report submitted across the team"
      />

      <Card title="Filters" className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            value={userId}
            onChange={(e) => filter(() => setUserId(e.target.value))}
          >
            <option value="">All team members</option>
            {users
              ?.filter((u) => u.role.name === "MEMBER")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
          </Select>

          <Select
            value={projectId}
            onChange={(e) => filter(() => setProjectId(e.target.value))}
          >
            <option value="">All projects</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          <Select
            value={status}
            onChange={(e) =>
              filter(() => setStatus(e.target.value as ReportStatus | ""))
            }
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>

          <Select value={week} onChange={(e) => filter(() => setWeek(e.target.value))}>
            <option value="">All weeks</option>
            {recentWeeks(12).map((w) => (
              <option key={w} value={w}>
                Week of {formatDate(w)}
              </option>
            ))}
          </Select>
        </div>

        {hasFilters && (
          <div className="mt-3">
            <Button
              variant="ghost"
              onClick={() =>
                filter(() => {
                  setUserId("");
                  setProjectId("");
                  setStatus("");
                  setWeek("");
                })
              }
            >
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      <Card title={data ? `${data.total} reports` : "Reports"}>
        {loading && <Spinner label="Loading reports" />}
        {error && <ErrorMessage message={error} />}

        {data && data.items.length === 0 && (
          <EmptyState
            title="No reports match these filters"
            description="Try widening the search."
          />
        )}

        {data && data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Team member</Th>
                  <Th>Week</Th>
                  <Th>Project</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Tasks</Th>
                  <Th className="text-right">Hours</Th>
                  <Th>Blockers</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <Td>
                      <Link
                        href={`/team/members/${report.author.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {report.author.full_name}
                      </Link>
                      {report.author.job_title && (
                        <p className="text-xs text-slate-500">
                          {report.author.job_title}
                        </p>
                      )}
                    </Td>
                    <Td className="text-slate-700">
                      {formatWeekRange(report.week_start_date, report.week_end_date)}
                      {report.current_version_no > 1 && (
                        <span className="ml-1.5 text-xs text-slate-400">
                          v{report.current_version_no}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {report.project ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
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
                        <Badge tone="amber">{report.open_blocker_count}</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <Link href={`/team/reports/${report.id}`}>
                        <Button variant="secondary">
                          {report.status === "SUBMITTED" ? "Review" : "View"}
                        </Button>
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {data.pages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Page {data.page} of {data.pages}
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
    </ProtectedRoute>
  );
}