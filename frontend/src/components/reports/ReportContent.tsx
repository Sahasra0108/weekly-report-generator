import { Badge, Card, Table, Td, Th } from "@/components/ui";
import { WORK_TYPE_LABELS } from "@/hooks/useReportForm";
import type { ReportDetail, TaskPriority, WorkType } from "@/types";

const priorityTone: Record<TaskPriority, "slate" | "blue" | "amber" | "red"> = {
    LOW: "slate",
    MEDIUM: "blue",
    HIGH: "amber",
    CRITICAL: "red",
};

const taskStatusLabels: Record<string, string> = {
    NOT_STARTED: "Not started",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    BLOCKED: "Blocked",
    CARRIED_OVER: "Carried over",
};

export function ReportContent({ report }: { report: ReportDetail }) {
    const totalPlanned = report.tasks.reduce((s, t) => s + Number(t.hours_planned), 0);
    const totalSpent = report.tasks.reduce((s, t) => s + Number(t.hours_spent), 0);
    const totalHours = report.hours.reduce((s, h) => s + Number(h.hours), 0);

    return (
        <div className="space-y-5">
            <Card title="Tasks completed">
                {report.tasks.length === 0 ? (
                    <p className="text-sm text-slate-500">No tasks recorded.</p>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Task</Th>
                                <Th>Priority</Th>
                                <Th>Status</Th>
                                <Th className="text-right">Planned %</Th>
                                <Th className="text-right">Actual %</Th>
                                <Th className="text-right">Hrs planned</Th>
                                <Th className="text-right">Hrs spent</Th>
                                <Th>Output</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.tasks.map((task, i) => (
                                <tr key={task.id ?? i}>
                                    <Td className="font-medium text-slate-900">{task.task_name}</Td>
                                    <Td>
                                        <Badge tone={priorityTone[task.priority]}>
                                            {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                                        </Badge>
                                    </Td>
                                    <Td className="text-slate-600">
                                        {taskStatusLabels[task.status] ?? task.status}
                                    </Td>
                                    <Td className="text-right tabular-nums">{task.planned_percent}%</Td>
                                    <Td className="text-right tabular-nums">
                                        <span
                                            className={
                                                task.actual_percent < task.planned_percent
                                                    ? "text-amber-700"
                                                    : undefined
                                            }
                                        >
                                            {task.actual_percent}%
                                        </span>
                                    </Td>
                                    <Td className="text-right tabular-nums">
                                        {Number(task.hours_planned).toFixed(1)}
                                    </Td>
                                    <Td className="text-right tabular-nums">
                                        <span
                                            className={
                                                Number(task.hours_spent) > Number(task.hours_planned)
                                                    ? "text-amber-700"
                                                    : undefined
                                            }
                                        >
                                            {Number(task.hours_spent).toFixed(1)}
                                        </span>
                                    </Td>
                                    <Td className="text-slate-600">{task.output || "—"}</Td>
                                </tr>
                            ))}
                            <tr className="border-t-2 border-line font-medium">
                                <Td className="text-muted">Total</Td>
                                <Td /> <Td /> <Td /> <Td />
                                <Td className="text-right tabular-nums">{totalPlanned.toFixed(1)}</Td>
                                <Td className="text-right tabular-nums">{totalSpent.toFixed(1)}</Td>
                                <Td />
                            </tr>
                        </tbody>
                    </Table>
                )}
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
                <Card title="Blockers and challenges">
                    {report.blockers.length === 0 ? (
                        <p className="text-sm text-slate-500">None reported.</p>
                    ) : (
                        <ul className="space-y-3">
                            {report.blockers.map((blocker, i) => (
                                <li key={blocker.id ?? i} className="flex gap-3">
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-700">{blocker.description}</p>
                                        <div className="mt-1 flex gap-1.5">
                                            {blocker.is_key_issue && <Badge tone="amber">Key issue</Badge>}
                                            {blocker.is_resolved && <Badge tone="green">Resolved</Badge>}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="Achievements and highlights">
                    {report.achievements.length === 0 ? (
                        <p className="text-sm text-slate-500">None recorded.</p>
                    ) : (
                        <ul className="space-y-3">
                            {report.achievements.map((achievement, i) => (
                                <li key={achievement.id ?? i} className="flex gap-3">
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-700">{achievement.description}</p>
                                        {achievement.is_key_achievement && (
                                            <div className="mt-1">
                                                <Badge tone="green">Key achievement</Badge>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="Planned for next week">
                    {report.planned_tasks.length === 0 ? (
                        <p className="text-sm text-slate-500">Nothing planned.</p>
                    ) : (
                        <ul className="space-y-2">
                            {report.planned_tasks.map((planned, i) => (
                                <li
                                    key={planned.id ?? i}
                                    className="flex items-start justify-between gap-3"
                                >
                                    <span className="text-sm text-slate-700">{planned.description}</span>
                                    <Badge tone={priorityTone[planned.priority]}>
                                        {planned.priority.charAt(0) + planned.priority.slice(1).toLowerCase()}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="Hours by task type" description={`${totalHours.toFixed(1)} hours total`}>
                    {report.hours.length === 0 ? (
                        <p className="text-sm text-slate-500">Not recorded.</p>
                    ) : (
                        <ul className="space-y-2">
                            {report.hours.map((entry, i) => {
                                const pct = totalHours ? (Number(entry.hours) / totalHours) * 100 : 0;
                                return (
                                    <li key={entry.id ?? i}>
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="text-slate-700">
                                                {WORK_TYPE_LABELS[entry.work_type as WorkType] ?? entry.work_type}
                                            </span>
                                            <span className="tabular-nums text-slate-500">
                                                {Number(entry.hours).toFixed(1)}h
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-slate-400"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </div>

            {(report.notes || report.links) && (
                <Card title="Notes and links">
                    {report.notes && (
                        <p className="whitespace-pre-wrap text-sm text-slate-700">{report.notes}</p>
                    )}
                    {report.links && (
                        <p className="mt-3 text-sm">
                            <a
                                href={report.links}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-900 underline hover:no-underline"
                            >
                                {report.links}
                            </a>
                        </p>
                    )}
                </Card>
            )}
        </div>
    );
}