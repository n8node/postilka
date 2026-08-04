"use client";

import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import {
  checkPasswordRules,
  isPasswordValid,
  PASSWORD_RULE_KEYS,
  PASSWORD_RULE_LABELS,
  PASSWORD_STRENGTH_LABELS,
  passwordStrength,
  type PasswordRuleKey,
  type PasswordStrength,
} from "@/lib/password-policy";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-slate-200 py-2 pl-3 pr-10 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

const STRENGTH_BAR: Record<PasswordStrength, string> = {
  0: "bg-slate-200",
  1: "bg-red-400",
  2: "bg-amber-400",
  3: "bg-accent",
  4: "bg-emerald-500",
};

const STRENGTH_TEXT: Record<PasswordStrength, string> = {
  0: "text-muted",
  1: "text-red-600",
  2: "text-amber-600",
  3: "text-accent",
  4: "text-emerald-600",
};

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  showStrength?: boolean;
  showRequirements?: boolean;
  required?: boolean;
};

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  showStrength = false,
  showRequirements = false,
  required = true,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const rules = useMemo(() => checkPasswordRules(value), [value]);
  const strength = useMemo(() => passwordStrength(value, rules), [value, rules]);
  const valid = isPasswordValid(rules);

  const strengthLabel =
    strength === 0 ? "" : PASSWORD_STRENGTH_LABELS[strength];

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          aria-describedby={
            showStrength || showRequirements ? `${id}-hints` : undefined
          }
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-text"
          aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {(showStrength || showRequirements) && value.length > 0 && (
        <div id={`${id}-hints`} className="mt-2 space-y-2">
          {showStrength && (
            <div className="space-y-1">
              <div
                className="flex gap-1"
                role="meter"
                aria-valuenow={strength}
                aria-valuemin={0}
                aria-valuemax={4}
              >
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors duration-200",
                      strength >= level
                        ? STRENGTH_BAR[strength]
                        : "bg-slate-200",
                    )}
                  />
                ))}
              </div>
              {strengthLabel && (
                <p className={cn("text-xs font-medium", STRENGTH_TEXT[strength])}>
                  {strengthLabel}
                </p>
              )}
            </div>
          )}

          {showRequirements && (
            <ul className="space-y-1 text-xs">
              {PASSWORD_RULE_KEYS.map((key) => (
                <RuleItem key={key} met={rules[key]} label={PASSWORD_RULE_LABELS[key]} />
              ))}
            </ul>
          )}
        </div>
      )}

      {showRequirements && value.length > 0 && !valid && (
        <span className="sr-only">Пароль не соответствует требованиям</span>
      )}
    </div>
  );
}

function RuleItem({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 transition-colors",
        met ? "text-emerald-700" : "text-muted",
      )}
    >
      <span
        className={cn(
          "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border text-[9px] leading-none",
          met
            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
            : "border-slate-300 bg-white",
        )}
        aria-hidden
      >
        {met ? "✓" : ""}
      </span>
      <span>{label}</span>
    </li>
  );
}

export { checkPasswordRules, isPasswordValid };
