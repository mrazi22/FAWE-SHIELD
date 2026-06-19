import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: "green" | "red" | "amber" | "navy";
};

export default function PrimaryButton({
  children,
  tone = "green",
  className = "",
  ...props
}: PrimaryButtonProps) {
  const toneClasses = {
    green: "bg-fawe-green hover:bg-fawe-greenDark shadow-green-200",
    red: "bg-fawe-red hover:bg-red-700 shadow-red-200",
    amber: "bg-fawe-amber hover:bg-amber-600 shadow-amber-200",
    navy: "bg-fawe-navy hover:bg-slate-800 shadow-slate-200",
  };

  return (
    <button
      {...props}
      className={`rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClasses[tone]} ${className}`}
    >
      {children}
    </button>
  );
}