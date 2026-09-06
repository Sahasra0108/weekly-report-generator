import type {
  Achievement,
  Blocker,
  HoursEntry,
  PlannedTask,
  ReportDetail,
  Task,
  TaskPriority,
  TaskStatus,
  VersionDetail,
  WorkType,
} from "@/types";

type Json = Record<string, unknown>;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  // Decimals are serialised as strings in the snapshot to avoid float drift.
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && !Number.isNaN(parsed) ? parsed : fallback;
}

function bool(value: unknown): boolean {
  return value === true;
}

function rows(value: unknown): Json[] {
  return Array.isArray(value) ? (value as Json[]) : [];
}

/**
 * Rebuild a ReportDetail from a stored snapshot so it can be rendered with the
 * same component as the live report.
 *
 * Snapshots are deliberately schema-loose: a version submitted before a field
 * existed simply won't have it, so every field is read defensively and falls
 * back rather than throwing. Metadata the snapshot doesn't carry (author,
 * status, review comments) is taken from the parent report.
 */
export function snapshotToReport(
  version: VersionDetail,
  parent: ReportDetail,
): ReportDetail {
  const snap = version.snapshot as Json;

  const tasks: Task[] = rows(snap.tasks).map((t, i) => ({
    id: -(i + 1), // negative ids: React keys only, never sent anywhere
    task_name: str(t.task_name, "Untitled task"),
    priority: (str(t.priority, "MEDIUM") as TaskPriority),
    status: (str(t.status, "NOT_STARTED") as TaskStatus),
    planned_percent: num(t.planned_percent),
    actual_percent: num(t.actual_percent),
    hours_planned: num(t.hours_planned),
    hours_spent: num(t.hours_spent),
    output: t.output == null ? null : str(t.output),
  }));

  const planned_tasks: PlannedTask[] = rows(snap.planned_tasks).map((p, i) => ({
    id: -(i + 1),
    description: str(p.description),
    priority: (str(p.priority, "MEDIUM") as TaskPriority),
  }));

  const blockers: Blocker[] = rows(snap.blockers).map((b, i) => ({
    id: -(i + 1),
    description: str(b.description),
    is_key_issue: bool(b.is_key_issue),
    is_resolved: bool(b.is_resolved),
  }));

  const achievements: Achievement[] = rows(snap.achievements).map((a, i) => ({
    id: -(i + 1),
    description: str(a.description),
    is_key_achievement: bool(a.is_key_achievement),
  }));

  const hours: HoursEntry[] = rows(snap.hours).map((h, i) => ({
    id: -(i + 1),
    work_type: (str(h.work_type, "OTHER") as WorkType),
    hours: num(h.hours),
  }));

  // The snapshot stores project_id and project_name; prefer the parent's
  // project object when the ids match so we keep the colour.
  const snapshotProjectId = typeof snap.project_id === "number" ? snap.project_id : null;
  const project =
    snapshotProjectId !== null && parent.project?.id === snapshotProjectId
      ? parent.project
      : snapshotProjectId !== null
        ? {
            id: snapshotProjectId,
            name: str(snap.project_name, "Unknown project"),
            color: null,
          }
        : null;

  return {
    ...parent,
    week_start_date: str(snap.week_start_date, parent.week_start_date),
    week_end_date: str(snap.week_end_date, parent.week_end_date),
    project,
    notes: snap.notes == null ? null : str(snap.notes),
    links: snap.links == null ? null : str(snap.links),
    tasks,
    planned_tasks,
    blockers,
    achievements,
    hours,
    current_version_no: version.version_no,
    submitted_at: version.submitted_at,
    is_editable: false, // history is never editable
  };
}