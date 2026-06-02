"use client";
// Web design-system primitives. Mirrors mobile/src/components/ui.tsx.
import { type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Button({
  children, onClick, variant = "primary", loading, disabled, type = "button", className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary: "bg-primary text-white border-transparent",
    secondary: "bg-surface text-text-secondary border-border",
    danger: "bg-danger-bg text-danger border-danger-border",
    ghost: "bg-transparent text-primary border-transparent",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`h-[52px] px-6 rounded-lg border font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {loading ? <span className="animate-pulse">…</span> : children}
    </button>
  );
}

export function Field({ label, error, children }: { label?: string; error?: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      {label && (
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-background border border-border rounded-md px-3 py-2.5 text-text-primary text-[15px] outline-none focus:border-primary placeholder:text-text-disabled ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-background border border-border rounded-md px-3 py-2.5 text-text-primary text-[15px] outline-none focus:border-primary placeholder:text-text-disabled resize-y ${props.className ?? ""}`}
    />
  );
}

export function Toggle({ label, icon, checked, onChange }: {
  label: string; icon?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between bg-background border border-border rounded-md px-3 py-2.5 mb-3 min-h-[52px]"
    >
      <span className="text-[15px] text-text-primary">{icon ? `${icon}  ` : ""}{label}</span>
      <span className={`w-11 h-6 rounded-full relative transition ${checked ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export function Badge({ children, color, bg }: { children: ReactNode; color: string; bg: string }) {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ color, backgroundColor: bg, borderColor: bg }}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-primary">
      <span className="text-2xl animate-pulse">🐕</span>
      {label && <span>{label}</span>}
    </div>
  );
}

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-text-tertiary">{message}</p>
    </div>
  );
}
