"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDate } from "@/lib/dates";
import { WORK_TYPE_LABELS } from "@/hooks/useReportForm";
import type {
  MemberStatus,
  ProjectWorkload,
  TrendPoint,
  WorkType,
  WorkTypeHours,
} from "@/types";

/** Shared palette so charts stay visually consistent. */
const PALETTE = [
  "#6d28d9",
  "#0891b2",
  "#0f9d58",
  "#ea580c",
  "#9333ea",
  "#2563eb",
  "#ca8a04",
  "#dc2626",
];

const axisProps = {
  stroke: "#94a3b8",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  contentStyle: {
    borderRadius: 6,
    border: "1px solid #e2e8f0",
    fontSize: 12,
    boxShadow: "0 1px 3px rgb(0 0 0 / 0.1)",
  },
};

/* ---------- Tasks completed over time ---------- */

export function TasksTrendChart({ data }: { data: TrendPoint[] }) {
  const rows = data.map((d) => ({
    week: formatDate(d.week_start_date).replace(/ \d{4}$/, ""),
    completed: d.tasks_completed,
    total: d.total_tasks,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="week" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="total"
          name="Tasks recorded"
          stroke="#cbd5e1"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="completed"
          name="Completed"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ---------- Submission status by team member ---------- */

export function MemberStatusChart({ data }: { data: MemberStatus[] }) {
  const rows = data.map((m) => ({
    // Surnames get long; first name only keeps the axis readable.
    name: m.full_name.split(" ")[0],
    hours: Number(m.total_hours),
    tasks: m.task_count,
    status: m.status,
  }));

  const statusColour: Record<string, string> = {
    APPROVED: "#16a34a",
    SUBMITTED: "#2563eb",
    NEEDS_CORRECTION: "#d97706",
    DRAFT: "#94a3b8",
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip
          {...tooltipStyle}
          formatter={(value) => [`${Number(value).toFixed(1)}h`, "Hours logged"]}
        />
        <Bar dataKey="hours" name="Hours logged" radius={[3, 3, 0, 0]}>
          {rows.map((row, i) => (
            <Cell
              key={i}
              fill={row.status ? statusColour[row.status] ?? "#cbd5e1" : "#e2e8f0"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Workload by project ---------- */

export function ProjectWorkloadChart({ data }: { data: ProjectWorkload[] }) {
  const rows = data.map((p, i) => ({
    name: p.project_name,
    hours: Number(p.total_hours),
    reports: p.report_count,
    fill: p.color ?? PALETTE[i % PALETTE.length],
  }));

  if (rows.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">
        No project data yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" {...axisProps} />
        <YAxis type="category" dataKey="name" width={130} {...axisProps} />
        <Tooltip
          {...tooltipStyle}
          formatter={(value) => [`${Number(value).toFixed(1)}h`, "Hours"]}
        />
        <Bar dataKey="hours" radius={[0, 3, 3, 0]}>
          {rows.map((row, i) => (
            <Cell key={i} fill={row.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Time by work type ---------- */

export function WorkTypeChart({ data }: { data: WorkTypeHours[] }) {
  const rows = data.map((w, i) => ({
    name: WORK_TYPE_LABELS[w.work_type as WorkType] ?? w.work_type,
    value: Number(w.total_hours),
    percentage: w.percentage,
    fill: PALETTE[i % PALETTE.length],
  }));

  if (rows.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">
        No hours recorded for this period.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {rows.map((row, i) => (
            <Cell key={i} fill={row.fill} />
          ))}
        </Pie>
        <Tooltip
          {...tooltipStyle}
          formatter={(value, name, entry) => [
            `${Number(value).toFixed(1)}h (${entry?.payload?.percentage ?? 0}%)`,
            name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ---------- Compliance breakdown ---------- */

export function ComplianceChart({
  approved,
  submitted,
  needsCorrection,
  draft,
  notStarted,
}: {
  approved: number;
  submitted: number;
  needsCorrection: number;
  draft: number;
  notStarted: number;
}) {
  const rows = [
    { name: "Approved", value: approved, fill: "#16a34a" },
    { name: "Awaiting review", value: submitted, fill: "#2563eb" },
    { name: "Needs correction", value: needsCorrection, fill: "#d97706" },
    { name: "Still a draft", value: draft, fill: "#94a3b8" },
    { name: "Not started", value: notStarted, fill: "#e2e8f0" },
  ].filter((r) => r.value > 0);

  if (rows.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">
        No reports for this week yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          paddingAngle={2}
        >
          {rows.map((row, i) => (
            <Cell key={i} fill={row.fill} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}