export type RoleName = "ADMIN" | "MANAGER" | "MEMBER";
export type ReportStatus = "DRAFT" | "SUBMITTED" | "NEEDS_CORRECTION" | "APPROVED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskStatus =
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED"
  | "CARRIED_OVER";
export type WorkType =
  | "DEVELOPMENT"
  | "TESTING"
  | "MEETINGS"
  | "DOCUMENTATION"
  | "REVIEW"
  | "OTHER";
export type ReviewAction = "APPROVED" | "REQUESTED_CHANGES";

export interface Role {
  id: number;
  name: RoleName;
  description: string | null;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  job_title: string | null;
  is_active: boolean;
  role: Role;
  created_at: string;
}

export interface UserBrief {
  id: number;
  full_name: string;
  email: string;
  job_title: string | null;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  members: UserBrief[];
}

export interface ProjectBrief {
  id: number;
  name: string;
  color: string | null;
}

export interface Task {
  id?: number;
  task_name: string;
  priority: TaskPriority;
  status: TaskStatus;
  planned_percent: number;
  actual_percent: number;
  hours_planned: number;
  hours_spent: number;
  output: string | null;
}

export interface PlannedTask {
  id?: number;
  description: string;
  priority: TaskPriority;
}

export interface Blocker {
  id?: number;
  description: string;
  is_key_issue: boolean;
  is_resolved: boolean;
}

export interface Achievement {
  id?: number;
  description: string;
  is_key_achievement: boolean;
}

export interface HoursEntry {
  id?: number;
  work_type: WorkType;
  hours: number;
}

export interface ReviewComment {
  id: number;
  action: ReviewAction;
  comment: string | null;
  created_at: string;
  version_id: number | null;
  reviewer: UserBrief | null;
}

export interface VersionBrief {
  id: number;
  version_no: number;
  submitted_at: string;
}

export interface VersionDetail extends VersionBrief {
  snapshot: Record<string, unknown>;
}

export interface ReportSummary {
  id: number;
  week_start_date: string;
  week_end_date: string;
  status: ReportStatus;
  current_version_no: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  author: UserBrief;
  project: ProjectBrief | null;
  task_count: number;
  open_blocker_count: number;
  total_hours: number;
}

export interface ReportDetail {
  id: number;
  week_start_date: string;
  week_end_date: string;
  status: ReportStatus;
  current_version_no: number;
  notes: string | null;
  links: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  author: UserBrief;
  project: ProjectBrief | null;
  reviewer: UserBrief | null;
  tasks: Task[];
  planned_tasks: PlannedTask[];
  blockers: Blocker[];
  achievements: Achievement[];
  hours: HoursEntry[];
  versions: VersionBrief[];
  review_comments: ReviewComment[];
  is_editable: boolean;
}

export interface ReportWrite {
  week_start_date: string;
  project_id: number | null;
  notes: string | null;
  links: string | null;
  tasks: Task[];
  planned_tasks: PlannedTask[];
  blockers: Blocker[];
  achievements: Achievement[];
  hours: HoursEntry[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface SummaryMetrics {
  week_start_date: string;
  total_team_members: number;
  reports_submitted: number;
  reports_approved: number;
  reports_needs_correction: number;
  reports_draft: number;
  reports_not_started: number;
  compliance_rate: number;
  open_blockers: number;
}

export interface TrendPoint {
  week_start_date: string;
  tasks_completed: number;
  total_tasks: number;
  reports_submitted: number;
}

export interface MemberStatus {
  user_id: number;
  full_name: string;
  job_title: string | null;
  status: ReportStatus | null;
  report_id: number | null;
  submitted_at: string | null;
  task_count: number;
  total_hours: number;
}

export interface ProjectWorkload {
  project_id: number | null;
  project_name: string;
  color: string | null;
  report_count: number;
  task_count: number;
  total_hours: number;
}

export interface WorkTypeHours {
  work_type: string;
  total_hours: number;
  percentage: number;
}

export interface ActivityItem {
  id: number;
  report_id: number;
  week_start_date: string;
  action: ReviewAction | null;
  comment: string | null;
  actor_name: string;
  author_name: string;
  occurred_at: string;
}

export interface SectionEntry {
  user_id: number;
  full_name: string;
  report_id: number | null;
  status: ReportStatus | null;
  items: string[];
  key_item: string | null;
}