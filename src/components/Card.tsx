import { ReactNode } from "react";

export default function Card({
  title,
  children,
  right,
}: {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm shadow-pink-100/60">
      {(title || right) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          )}

          {right}
        </div>
      )}

      {children}
    </div>
  );
}