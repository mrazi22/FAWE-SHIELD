import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function SectionCard({
  title,
  subtitle,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-soft">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-lg font-black text-fawe-navy">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}