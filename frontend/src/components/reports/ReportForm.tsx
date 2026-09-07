"use client";

import { useRouter } from "next/navigation";

import {
  Button,
  Card,
  ErrorMessage,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { WORK_TYPES, WORK_TYPE_LABELS, useReportForm } from "@/hooks/useReportForm";
import { formatWeekRange, recentWeeks, shiftWeeks } from "@/lib/dates";
import type {
  Project,
  ReportDetail,
  ReportWrite,
  TaskPriority,
  TaskStatus,
} from "@/types";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "CARRIED_OVER", label: "Carried over" },
];

interface Props {
  report?: ReportDetail;
  projects: Project[];
  onSave: (payload: ReportWrite) => Promise<void>;
  onSubmitForReview?: (payload: ReportWrite) => Promise<void>;
  saving: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
}

export function ReportForm({
  report,
  projects,
  onSave,
  onSubmitForReview,
  saving,
  error,
  fieldErrors,
}: Props) {
  const router = useRouter();
  const f = useReportForm(report);
  const isEdit = Boolean(report);

  const weekOptions = recentWeeks(8).concat(shiftWeeks(recentWeeks(1)[0], 1));

  async function handleSave() {
    await onSave(f.toPayload());
  }

  async function handleSubmit() {
    if (onSubmitForReview) await onSubmitForReview(f.toPayload());
  }

  return (
    <div className="space-y-5">
      {error && <ErrorMessage message={error} />}

      {/* ---- Week and project ---- */}
      <Card title="Week" description="Reports cover a Monday to Friday week">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Week starting"
            required
            error={fieldErrors.week_start_date}
            hint={isEdit ? "The week cannot be changed after creation" : undefined}
          >
            <Select
              value={f.form.week_start_date}
              onChange={(e) => f.setField("week_start_date", e.target.value)}
              disabled={isEdit}
              invalid={Boolean(fieldErrors.week_start_date)}
            >
              {weekOptions.map((week) => (
                <option key={week} value={week}>
                  {formatWeekRange(week, shiftWeeks(week, 0).replace(/$/, ""))
                    .replace(/–.*/, "") /* fallback if end unknown */}
                  {" "}
                  {week}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Project or category" error={fieldErrors.project_id}>
            <Select
              value={f.form.project_id ?? ""}
              onChange={(e) =>
                f.setField("project_id", e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {/* ---- Tasks completed ---- */}
      <Card
        title="Tasks completed"
        description="What you worked on this week"
        actions={
          <Button variant="secondary" onClick={f.addTask} type="button">
            Add task
          </Button>
        }
      >
        {f.form.tasks.length === 0 && (
          <p className="py-4 text-sm text-slate-500">
            No tasks yet. Add at least one before submitting.
          </p>
        )}

        <div className="space-y-4">
          {f.form.tasks.map((task, i) => (
            <div
              key={i}
              className="rounded-md border border-slate-200 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Field
                    label={`Task ${i + 1}`}
                    required
                    error={fieldErrors[`tasks.${i}.task_name`]}
                  >
                    <Input
                      value={task.task_name}
                      onChange={(e) => f.updateTask(i, "task_name", e.target.value)}
                      placeholder="Implement the report submission endpoint"
                      invalid={Boolean(fieldErrors[`tasks.${i}.task_name`])}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => f.removeTask(i)}
                  className="mt-7 rounded px-2 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove task ${i + 1}`}
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Priority">
                  <Select
                    value={task.priority}
                    onChange={(e) =>
                      f.updateTask(i, "priority", e.target.value as TaskPriority)
                    }
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Status">
                  <Select
                    value={task.status}
                    onChange={(e) =>
                      f.updateTask(i, "status", e.target.value as TaskStatus)
                    }
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Planned %" error={fieldErrors[`tasks.${i}.planned_percent`]}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={task.planned_percent}
                    onChange={(e) =>
                      f.updateTask(i, "planned_percent", Number(e.target.value))
                    }
                  />
                </Field>

                <Field label="Actual %" error={fieldErrors[`tasks.${i}.actual_percent`]}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={task.actual_percent}
                    onChange={(e) =>
                      f.updateTask(i, "actual_percent", Number(e.target.value))
                    }
                  />
                </Field>

                <Field label="Hours planned">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={task.hours_planned}
                    onChange={(e) =>
                      f.updateTask(i, "hours_planned", Number(e.target.value))
                    }
                  />
                </Field>

                <Field label="Hours spent">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={task.hours_spent}
                    onChange={(e) =>
                      f.updateTask(i, "hours_spent", Number(e.target.value))
                    }
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Output / deliverable">
                    <Input
                      value={task.output ?? ""}
                      onChange={(e) => f.updateTask(i, "output", e.target.value)}
                      placeholder="Merged PR #142"
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ---- Next week ---- */}
      <Card
        title="Planned for next week"
        actions={
          <Button variant="secondary" onClick={f.addPlanned} type="button">
            Add item
          </Button>
        }
      >
        {f.form.planned_tasks.length === 0 && (
          <p className="py-2 text-sm text-slate-500">Nothing planned yet.</p>
        )}

        <div className="space-y-2">
          {f.form.planned_tasks.map((planned, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={planned.description}
                onChange={(e) => f.updatePlanned(i, "description", e.target.value)}
                placeholder="Start work on the notification service"
                className="flex-1"
              />
              <Select
                value={planned.priority}
                onChange={(e) =>
                  f.updatePlanned(i, "priority", e.target.value as TaskPriority)
                }
                className="w-32"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => f.removePlanned(i)}
                className="rounded px-2 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* ---- Blockers ---- */}
      <Card
        title="Blockers and challenges"
        description="Mark the one that mattered most this week"
        actions={
          <Button variant="secondary" onClick={f.addBlocker} type="button">
            Add blocker
          </Button>
        }
      >
        {f.form.blockers.length === 0 && (
          <p className="py-2 text-sm text-slate-500">No blockers this week.</p>
        )}

        <div className="space-y-2">
          {f.form.blockers.map((blocker, i) => (
            <div key={i} className="flex items-start gap-3">
              <label className="mt-2.5 flex shrink-0 items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="radio"
                  name="key-blocker"
                  checked={blocker.is_key_issue}
                  onChange={() => f.setKeyBlocker(i)}
                  className="h-3.5 w-3.5"
                />
                Key issue
              </label>
              <Textarea
                rows={2}
                value={blocker.description}
                onChange={(e) => f.updateBlocker(i, "description", e.target.value)}
                placeholder="Waiting on API credentials from the client"
                className="flex-1"
              />
              <label className="mt-2.5 flex shrink-0 items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={blocker.is_resolved}
                  onChange={(e) => f.updateBlocker(i, "is_resolved", e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Resolved
              </label>
              <button
                type="button"
                onClick={() => f.removeBlocker(i)}
                className="mt-2 rounded px-2 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* ---- Achievements ---- */}
      <Card
        title="Achievements and highlights"
        description="Mark the one you're proudest of"
        actions={
          <Button variant="secondary" onClick={f.addAchievement} type="button">
            Add achievement
          </Button>
        }
      >
        {f.form.achievements.length === 0 && (
          <p className="py-2 text-sm text-slate-500">Nothing recorded yet.</p>
        )}

        <div className="space-y-2">
          {f.form.achievements.map((achievement, i) => (
            <div key={i} className="flex items-start gap-3">
              <label className="mt-2.5 flex shrink-0 items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="radio"
                  name="key-achievement"
                  checked={achievement.is_key_achievement}
                  onChange={() => f.setKeyAchievement(i)}
                  className="h-3.5 w-3.5"
                />
                Key achivement
              </label>
              <Textarea
                rows={2}
                value={achievement.description}
                onChange={(e) => f.updateAchievement(i, e.target.value)}
                placeholder="Cut dashboard load time from 4s to under 1s"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => f.removeAchievement(i)}
                className="mt-2 rounded px-2 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* ---- Hours ---- */}
      <Card
        title="Hours by task type"
        description={`Total: ${f.totalHours.toFixed(1)} hours`}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {WORK_TYPES.map((type) => (
            <Field key={type} label={WORK_TYPE_LABELS[type]}>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={f.hoursFor(type) || ""}
                onChange={(e) => f.setHours(type, Number(e.target.value))}
                placeholder="0"
              />
            </Field>
          ))}
        </div>
      </Card>

      {/* ---- Notes ---- */}
      <Card title="Notes and links">
        <div className="space-y-4">
          <Field label="Notes">
            <Textarea
              value={f.form.notes ?? ""}
              onChange={(e) => f.setField("notes", e.target.value)}
              placeholder="Anything else worth mentioning"
            />
          </Field>
          <Field label="Links">
            <Input
              value={f.form.links ?? ""}
              onChange={(e) => f.setField("links", e.target.value)}
              placeholder="https://github.com/example/repo/pull/142"
            />
          </Field>
        </div>
      </Card>

      {/* ---- Actions ---- */}
      <div className="flex flex-wrap items-center justify-end gap-2 pb-8">
        <Button variant="ghost" type="button" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button variant="secondary" type="button" onClick={handleSave} loading={saving}>
          Save draft
        </Button>
        {onSubmitForReview && (
          <Button type="button" onClick={handleSubmit} loading={saving}>
            Submit for review
          </Button>
        )}
      </div>
    </div>
  );
}