import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  sublabel?: string;
  tone?: "default" | "amber" | "red" | "green";
}

const toneClasses = {
  default: "text-slate-900",
  amber: "text-amber-700",
  red: "text-red-700",
  green: "text-green-700",
};

export function MetricCard({ label, value, sublabel, tone = "default" }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${toneClasses[tone]}`}>
        {value}
      </p>
      {sublabel && <p className="mt-0.5 text-xs text-slate-500">{sublabel}</p>}
    </div>
  );
}