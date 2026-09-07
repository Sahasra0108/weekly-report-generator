"use client";

import { checkPassword, passwordStrength } from "@/lib/password";

interface Props {
  password: string;
  email?: string;
}

export function PasswordStrength({ password, email }: Props) {
  if (password.length === 0) return null;

  const rules = checkPassword(password, email);
  const { score, label } = passwordStrength(password);

  const barColour = ["bg-slate-200", "bg-red-500", "bg-amber-500", "bg-green-600"][
    score
  ];
  const labelColour = ["text-slate-500", "text-red-600", "text-amber-600", "text-green-700"][
    score
  ];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3].map((segment) => (
            <div
              key={segment}
              className={`h-1 flex-1 rounded-full transition-colors ${
                segment <= score ? barColour : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${labelColour}`}>{label}</span>
      </div>

      <ul className="space-y-0.5">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-xs ${
              rule.met ? "text-green-700" : "text-slate-500"
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] ${
                rule.met ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              {rule.met ? "✓" : "○"}
            </span>
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}