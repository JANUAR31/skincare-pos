"use client";

export default function PrintReceiptButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
    >
      Cetak Struk
    </button>
  );
}