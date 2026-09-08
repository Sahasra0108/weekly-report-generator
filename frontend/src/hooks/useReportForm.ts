"use client";

import { useCallback, useState } from "react";

import { currentWeekStart } from "@/lib/dates";
import type {
  Achievement,
  Blocker,
  HoursEntry,
  PlannedTask,
  ReportDetail,
  ReportWrite,
  Task,
  WorkType,
} from "@/types";

export const WORK_TYPES: WorkType[] = [
  "DEVELOPMENT",
  "TESTING",
  "MEETINGS",
  "DOCUMENTATION",
  "REVIEW",
  "OTHER",
];

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  MEETINGS: "Meetings",
  DOCUMENTATION: "Documentation",
  REVIEW: "Code review",
  OTHER: "Other",
};

const emptyTask = (): Task => ({
  task_name: "",
  priority: "MEDIUM",
  status: "IN_PROGRESS",
  planned_percent: 0,
  actual_percent: 0,
  hours_planned: 0,
  hours_spent: 0,
  output: "",
});

function initialState(report?: ReportDetail): ReportWrite {
  if (report) {
    return {
      week_start_date: report.week_start_date,
      project_id: report.project?.id ?? null,
      notes: report.notes ?? "",
      links: report.links ?? "",
      tasks: report.tasks.map((t) => ({ ...t, output: t.output ?? "" })),
      planned_tasks: report.planned_tasks.map((p) => ({ ...p })),
      blockers: report.blockers.map((b) => ({ ...b })),
      achievements: report.achievements.map((a) => ({ ...a })),
      hours: report.hours.map((h) => ({ ...h })),
    };
  }

  return {
    week_start_date: currentWeekStart(),
    project_id: null,
    notes: "",
    links: "",
    tasks: [emptyTask()],
    planned_tasks: [],
    blockers: [],
    achievements: [],
    hours: [],
  };
}

export function useReportForm(report?: ReportDetail) {
  const [form, setForm] = useState<ReportWrite>(() => initialState(report));

  const setField = useCallback(
    <K extends keyof ReportWrite>(key: K, value: ReportWrite[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  /* ---- tasks ---- */

  const addTask = useCallback(() => {
    setForm((f) => ({ ...f, tasks: [...f.tasks, emptyTask()] }));
  }, []);

  const updateTask = useCallback(
    <K extends keyof Task>(index: number, key: K, value: Task[K]) => {
      setForm((f) => ({
        ...f,
        tasks: f.tasks.map((t, i) => (i === index ? { ...t, [key]: value } : t)),
      }));
    },
    [],
  );

  const removeTask = useCallback((index: number) => {
    setForm((f) => ({ ...f, tasks: f.tasks.filter((_, i) => i !== index) }));
  }, []);

  /* ---- planned tasks ---- */

  const addPlanned = useCallback(() => {
    setForm((f) => ({
      ...f,
      planned_tasks: [...f.planned_tasks, { description: "", priority: "MEDIUM" }],
    }));
  }, []);

  const updatePlanned = useCallback(
    <K extends keyof PlannedTask>(index: number, key: K, value: PlannedTask[K]) => {
      setForm((f) => ({
        ...f,
        planned_tasks: f.planned_tasks.map((p, i) =>
          i === index ? { ...p, [key]: value } : p,
        ),
      }));
    },
    [],
  );

  const removePlanned = useCallback((index: number) => {
    setForm((f) => ({
      ...f,
      planned_tasks: f.planned_tasks.filter((_, i) => i !== index),
    }));
  }, []);

  /* ---- blockers ---- */

  const addBlocker = useCallback(() => {
    setForm((f) => ({
      ...f,
      blockers: [
        ...f.blockers,
        { description: "", is_key_issue: f.blockers.length === 0, is_resolved: false },
      ],
    }));
  }, []);

  const updateBlocker = useCallback(
    <K extends keyof Blocker>(index: number, key: K, value: Blocker[K]) => {
      setForm((f) => ({
        ...f,
        blockers: f.blockers.map((b, i) => (i === index ? { ...b, [key]: value } : b)),
      }));
    },
    [],
  );

  /** The backend allows only one key issue, so selecting one clears the rest. */
  const setKeyBlocker = useCallback((index: number) => {
    setForm((f) => ({
      ...f,
      blockers: f.blockers.map((b, i) => ({ ...b, is_key_issue: i === index })),
    }));
  }, []);

  const removeBlocker = useCallback((index: number) => {
    setForm((f) => {
      const remaining = f.blockers.filter((_, i) => i !== index);
      // If the key issue was removed, promote the first remaining one.
      if (remaining.length > 0 && !remaining.some((b) => b.is_key_issue)) {
        remaining[0] = { ...remaining[0], is_key_issue: true };
      }
      return { ...f, blockers: remaining };
    });
  }, []);

  /* ---- achievements ---- */

  const addAchievement = useCallback(() => {
    setForm((f) => ({
      ...f,
      achievements: [
        ...f.achievements,
        { description: "", is_key_achievement: f.achievements.length === 0 },
      ],
    }));
  }, []);

  const updateAchievement = useCallback(
    (index: number, description: string) => {
      setForm((f) => ({
        ...f,
        achievements: f.achievements.map((a, i) =>
          i === index ? { ...a, description } : a,
        ),
      }));
    },
    [],
  );

  const setKeyAchievement = useCallback((index: number) => {
    setForm((f) => ({
      ...f,
      achievements: f.achievements.map((a, i) => ({
        ...a,
        is_key_achievement: i === index,
      })),
    }));
  }, []);

  const removeAchievement = useCallback((index: number) => {
    setForm((f) => {
      const remaining = f.achievements.filter((_, i) => i !== index);
      if (remaining.length > 0 && !remaining.some((a) => a.is_key_achievement)) {
        remaining[0] = { ...remaining[0], is_key_achievement: true };
      }
      return { ...f, achievements: remaining };
    });
  }, []);

  /* ---- hours ---- */

  /** Hours are keyed by work type, so we set a value rather than pushing a row. */
  const setHours = useCallback((workType: WorkType, hours: number) => {
    setForm((f) => {
      const existing = f.hours.find((h) => h.work_type === workType);
      if (hours <= 0) {
        return { ...f, hours: f.hours.filter((h) => h.work_type !== workType) };
      }
      if (existing) {
        return {
          ...f,
          hours: f.hours.map((h) =>
            h.work_type === workType ? { ...h, hours } : h,
          ),
        };
      }
      return { ...f, hours: [...f.hours, { work_type: workType, hours }] };
    });
  }, []);

  const hoursFor = useCallback(
    (workType: WorkType): number =>
      form.hours.find((h) => h.work_type === workType)?.hours ?? 0,
    [form.hours],
  );

  const totalHours = form.hours.reduce((sum, h) => sum + Number(h.hours || 0), 0);

  /** Strip empty rows and normalise nulls before sending. */
  const toPayload = useCallback((): ReportWrite => {
    return {
      ...form,
      notes: form.notes?.trim() || null,
      links: form.links?.trim() || null,
      tasks: form.tasks
        .filter((t) => t.task_name.trim())
        .map((t) => ({
          ...t,
          task_name: t.task_name.trim(),
          output: t.output?.trim() || null,
          hours_planned: Number(t.hours_planned) || 0,
          hours_spent: Number(t.hours_spent) || 0,
        })),
      planned_tasks: form.planned_tasks
        .filter((p) => p.description.trim())
        .map((p) => ({ ...p, description: p.description.trim() })),
      blockers: form.blockers
        .filter((b) => b.description.trim())
        .map((b) => ({ ...b, description: b.description.trim() })),
      achievements: form.achievements
        .filter((a) => a.description.trim())
        .map((a) => ({ ...a, description: a.description.trim() })),
      hours: form.hours.filter((h) => Number(h.hours) > 0),
    };
  }, [form]);

  const [touched, setTouched] = useState<Set<string>>(new Set());

  const touch = useCallback((key: string) => {
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, []);

  const touchAll = useCallback(() => {
    const keys = new Set<string>(["project_id"]);
    form.tasks.forEach((_, i) => {
      keys.add(`tasks.${i}.task_name`);
      keys.add(`tasks.${i}.actual_percent`);
    });
    setTouched(keys);
  }, [form.tasks]);

  /** Field-level rules, keyed the same way the backend keys its 422 errors. */
  const validationErrors: Record<string, string> = {};

  if (!form.project_id) {
    validationErrors.project_id = "Choose a project before submitting";
  }

  form.tasks.forEach((task, i) => {
    if (!task.task_name.trim()) {
      validationErrors[`tasks.${i}.task_name`] = "Give the task a name";
    }
    if (Number(task.actual_percent) <= 0) {
      validationErrors[`tasks.${i}.actual_percent`] =
        "Record how far this task got";
    }
    if (Number(task.planned_percent) < 0 || Number(task.planned_percent) > 100) {
      validationErrors[`tasks.${i}.planned_percent`] = "Must be between 0 and 100";
    }
    if (Number(task.hours_spent) < 0) {
      validationErrors[`tasks.${i}.hours_spent`] = "Cannot be negative";
    }
  });

  /** Only surface an error once its field has been touched. */
  const visibleErrors: Record<string, string> = Object.fromEntries(
    Object.entries(validationErrors).filter(([key]) => touched.has(key)),
  );

  const submissionProblems: string[] = [];

  if (!form.project_id) {
    submissionProblems.push("Select a project or category");
  }
  if (!form.tasks.some((t) => t.task_name.trim())) {
    submissionProblems.push("Add at least one completed task");
  }
  if (form.tasks.some((t) => !t.task_name.trim() || Number(t.actual_percent) <= 0)) {
    submissionProblems.push("Complete every task row, or remove the empty ones");
  }
  if (form.hours.reduce((sum, h) => sum + Number(h.hours || 0), 0) <= 0) {
    submissionProblems.push("Record your hours by task type");
  }

  const readyToSubmit = submissionProblems.length === 0;


  return {
    form,
    setField,
    addTask,
    updateTask,
    removeTask,
    addPlanned,
    updatePlanned,
    removePlanned,
    addBlocker,
    updateBlocker,
    setKeyBlocker,
    removeBlocker,
    addAchievement,
    updateAchievement,
    setKeyAchievement,
    removeAchievement,
    setHours,
    hoursFor,
    totalHours,
    touch,
    touchAll,
    visibleErrors,
    submissionProblems,
    readyToSubmit,
    toPayload,
  };
}