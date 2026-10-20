"use client";

export default function PrintButton({
  label = "Print",
}: {
  label?: string;
}) {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
    >
      {label}
    </button>
  );
}