import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  sublabel?: string;
  tone?: "default" | "amber" | "red" | "green";
}

export function MetricCard({ label, value, sublabel }: Props) {
  return (
    <div className="rounded-xl bg-primary px-5 py-4 shadow-[0_2px_8px_rgb(109_40_217/0.20)]">
      <p className="text-xs font-medium uppercase tracking-wide text-white/70">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-white">
        {value}
      </p>
      {sublabel && <p className="mt-0.5 text-xs text-white/70">{sublabel}</p>}
    </div>
  );
}