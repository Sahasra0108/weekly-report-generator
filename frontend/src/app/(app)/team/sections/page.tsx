"use client";

import Link from "next/link";
import { useState } from "react";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import {
  Badge,
  Card,
  ErrorMessage,
  PageHeader,
  Select,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import { useQuery } from "@/hooks/useApi";
import { qs } from "@/lib/api";
import { currentWeekStart, formatDate, recentWeeks } from "@/lib/dates";
import type { SectionEntry } from "@/types";

type Section = "blockers" | "achievements";

export default function SectionComparePage() {
  const [week, setWeek] = useState(currentWeekStart());
  const [section, setSection] = useState<Section>("blockers");

  const { data, loading, error } = useQuery<SectionEntry[]>(
    `/dashboard/section${qs({ section, week_start: week })}`,
  );

  return (
    <ProtectedRoute require="manager">
      <PageHeader
        title="Compare across the team"
        description="One section of every member's report, side by side"
        actions={
          <div className="flex gap-2">
            <Select
              value={section}
              onChange={(e) => setSection(e.target.value as Section)}
              className="w-40"
            >
              <option value="blockers">Blockers</option>
              <option value="achievements">Achievements</option>
            </Select>
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
          </div>
        }
      />

      {loading && <Spinner label="Loading" />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((entry) => (
            <Card
              key={entry.user_id}
              title={entry.full_name}
              actions={<StatusBadge status={entry.status} />}
            >
              {entry.items.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {entry.report_id
                    ? `No ${section} recorded.`
                    : "No report submitted for this week."}
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {entry.items.map((item, i) => (
                    <li key={i} className="text-sm">
                      <p className="text-slate-700">{item}</p>
                      {item === entry.key_item && (
                        <div className="mt-1">
                          <Badge tone={section === "blockers" ? "amber" : "green"}>
                            {section === "blockers" ? "Key issue" : "Key achievement"}
                          </Badge>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {entry.report_id && (
                <Link
                  href={`/team/reports/${entry.report_id}`}
                  className="mt-3 inline-block text-sm font-medium text-slate-900 hover:underline"
                >
                  Open report
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}