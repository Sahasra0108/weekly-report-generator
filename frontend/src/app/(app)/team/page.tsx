"use client";

import Link from "next/link";
import { useState } from "react";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { MetricCard } from "@/components/dashboard/MetricCard";
import {
  ComplianceChart,
  MemberStatusChart,
  ProjectWorkloadChart,
  TasksTrendChart,
  WorkTypeChart,
} from "@/components/dashboard/charts";
import {
  Badge,
  Button,
  Card,
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
import { currentWeekStart, formatDate, formatDateTime, recentWeeks } from "@/lib/dates";
import type {
  ActivityItem,
  MemberStatus,
  ProjectWorkload,
  SummaryMetrics,
  TrendPoint,
  WorkTypeHours,
} from "@/types";
import { AiSummaryCard } from "@/components/assistant/AiSummaryCard";
import { useAuth } from "@/lib/auth-context";

export default function TeamDashboardPage() {
  const [week, setWeek] = useState(currentWeekStart());

  const summary = useQuery<SummaryMetrics>(`/dashboard/summary${qs({ week_start: week })}`);
  const members = useQuery<MemberStatus[]>(`/dashboard/members${qs({ week_start: week })}`);
  const trend = useQuery<TrendPoint[]>("/dashboard/trend?weeks=8");
  const projects = useQuery<ProjectWorkload[]>("/dashboard/projects");
  const workTypes = useQuery<WorkTypeHours[]>("/dashboard/work-types");
  const activity = useQuery<ActivityItem[]>("/dashboard/activity?limit=12");
  const { user } = useAuth();

  const s = summary.data;

  return (
    <ProtectedRoute require="manager">
      <PageHeader
        title="Team dashboard"
        description="Submission compliance and workload across the team"
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="w-48"
            >
              {recentWeeks(12).map((w) => (
                <option key={w} value={w}>
                  Week of {formatDate(w)}
                </option>
              ))}
            </Select>
            <Link href="/team/sections">
              <Button variant="secondary" className="whitespace-nowrap">Compare week</Button>
            </Link>
          </div>
        }
      />

      {summary.error && <ErrorMessage message={summary.error} />}
      {summary.loading && <Spinner label="Loading dashboard" />}

      {s && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Reports this week"
              value={s.reports_submitted + s.reports_approved + s.reports_needs_correction}
              sublabel={`of ${s.total_team_members} team members`}
            />
            <MetricCard
              label="Compliance rate"
              value={`${s.compliance_rate}%`}
              sublabel={
                s.reports_not_started > 0
                  ? `${s.reports_not_started} not started`
                  : "everyone has reported"
              }
              tone={s.compliance_rate >= 80 ? "green" : "amber"}
            />
            <MetricCard
              label="Needs correction"
              value={s.reports_needs_correction}
              sublabel="sent back to authors"
              tone={s.reports_needs_correction > 0 ? "amber" : "default"}
            />
            <MetricCard
              label="Open blockers"
              value={s.open_blockers}
              sublabel="unresolved across the team"
              tone={s.open_blockers > 0 ? "red" : "default"}
            />
          </div>

          <div className="mt-5 mb-5">
            <AiSummaryCard weekStart={week} />
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <Card
              title="Tasks completed over time"
              description="Last 8 weeks, team-wide"
            >
              {trend.loading && <Spinner />}
              {trend.data && <TasksTrendChart data={trend.data} />}
            </Card>

            <Card
              title="Submission status this week"
              description="Bar colour shows each member's report status"
            >
              {members.loading && <Spinner />}
              {members.data && <MemberStatusChart data={members.data} />}
            </Card>

            <Card title="Workload by project" description="Hours logged, all time">
              {projects.loading && <Spinner />}
              {projects.data && <ProjectWorkloadChart data={projects.data} />}
            </Card>

            <Card title="Where time goes" description="Hours by task type, team-wide">
              {workTypes.loading && <Spinner />}
              {workTypes.data && <WorkTypeChart data={workTypes.data} />}
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card
              title="This week at a glance"
              description={`Week of ${formatDate(week)}`}
            >
              <ComplianceChart
                approved={s.reports_approved}
                submitted={s.reports_submitted}
                needsCorrection={s.reports_needs_correction}
                draft={s.reports_draft}
                notStarted={s.reports_not_started}
              />
            </Card>

            <Card
              title="Team status"
              description="Who has reported this week"
              className="lg:col-span-2"
            >
              {members.loading && <Spinner />}
              {members.data && (
                <Table>
                  <thead>
                    <tr>
                      <Th>Team member</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Tasks</Th>
                      <Th className="text-right">Hours</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {members.data.map((member) => (
                      <tr key={member.user_id} className="hover:bg-slate-50">
                        <Td>
                          <Link
                            href={`/team/members/${member.user_id}`}
                            className="font-medium text-slate-900 hover:underline"
                          >
                            {member.full_name}
                          </Link>
                          {member.job_title && (
                            <p className="text-xs text-slate-500">{member.job_title}</p>
                          )}
                        </Td>
                        <Td>
                          <StatusBadge status={member.status} />
                        </Td>
                        <Td className="text-right tabular-nums">{member.task_count}</Td>
                        <Td className="text-right tabular-nums">
                          {Number(member.total_hours).toFixed(1)}
                        </Td>
                        <Td className="text-right">
                          {member.report_id && (
                            <Link
                              href={`/team/reports/${member.report_id}`}
                              className="text-sm font-medium text-slate-900 hover:underline"
                            >
                              {member.status === "SUBMITTED" &&
                                member.user_id !== user?.id
                                ? "Review"
                                : "View"}
                            </Link>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          </div>
          <div className="mt-5">
            <Card title="Recent activity" description="Submissions and review decisions">
              {activity.loading && <Spinner />}
              {activity.data && activity.data.length === 0 && (
                <p className="text-sm text-slate-500">Nothing yet.</p>
              )}
              {activity.data && activity.data.length > 0 && (
                <ul className="space-y-3">
                  {activity.data.map((item) => (
                    <li key={`${item.action ?? "submit"}-${item.id}`} className="flex gap-3">
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.action === "APPROVED"
                          ? "bg-green-500"
                          : item.action === "REQUESTED_CHANGES"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                          }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">
                            {item.actor_name}
                          </span>{" "}
                          {item.action === "APPROVED"
                            ? "approved"
                            : item.action === "REQUESTED_CHANGES"
                              ? "requested changes on"
                              : "submitted"}{" "}
                          {item.action ? (
                            <>
                              <Link
                                href={`/team/reports/${item.report_id}`}
                                className="font-medium text-slate-900 hover:underline"
                              >
                                {item.author_name}&apos;s report
                              </Link>
                            </>
                          ) : (
                            <Link
                              href={`/team/reports/${item.report_id}`}
                              className="font-medium text-slate-900 hover:underline"
                            >
                              their report
                            </Link>
                          )}{" "}
                          <span className="text-slate-500">
                            for the week of {formatDate(item.week_start_date)}
                          </span>
                        </p>
                        {item.comment && (
                          <p className="mt-0.5 text-sm text-slate-500">
                            &ldquo;{item.comment}&rdquo;
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDateTime(item.occurred_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </ProtectedRoute>
  );
}