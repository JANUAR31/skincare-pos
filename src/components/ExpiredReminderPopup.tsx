"use client";

import { useEffect, useState } from "react";

type ExpiredItem = {
  id: number;
  code: string;
  name: string;
  expiredDate: string;
};

export default function ExpiredReminderPopup({
  expiredCount,
  sixMonthCount,
  twelveMonthCount,
  expiredItems,
  sixMonthItems,
  twelveMonthItems,
}: {
  expiredCount: number;
  sixMonthCount: number;
  twelveMonthCount: number;
  expiredItems: ExpiredItem[];
  sixMonthItems: ExpiredItem[];
  twelveMonthItems: ExpiredItem[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasWarning =
      expiredCount > 0 || sixMonthCount > 0 || twelveMonthCount > 0;

    if (hasWarning) {
      setOpen(true);
    }
  }, [expiredCount, sixMonthCount, twelveMonthCount]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-pink-500 to-pink-400 p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-pink-100">
                Pengingat Produk
              </p>
              <h2 className="text-2xl font-bold">Peringatan Expired</h2>
              <p className="mt-1 text-sm text-pink-50">
                Ada produk yang sudah expired atau mendekati tanggal expired.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white hover:bg-white/30"
            >
              X
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-600">
                Sudah Expired
              </p>
              <p className="mt-1 text-3xl font-bold text-red-700">
                {expiredCount}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-sm font-medium text-orange-600">
                Expired ≤ 6 Bulan
              </p>
              <p className="mt-1 text-3xl font-bold text-orange-700">
                {sixMonthCount}
              </p>
            </div>

            <div className="rounded-2xl border border-pink-100 bg-pink-50 p-4">
              <p className="text-sm font-medium text-pink-600">
                Expired 6–12 Bulan
              </p>
              <p className="mt-1 text-3xl font-bold text-pink-700">
                {twelveMonthCount}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {expiredItems.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold text-red-700">
                  Produk Sudah Expired
                </h3>

                <div className="space-y-2">
                  {expiredItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm"
                    >
                      <p className="font-semibold text-slate-900">
                        {item.code} - {item.name}
                      </p>
                      <p className="text-red-700">
                        Expired: {item.expiredDate}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sixMonthItems.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold text-orange-700">
                  Produk Akan Expired Dalam 6 Bulan
                </h3>

                <div className="space-y-2">
                  {sixMonthItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm"
                    >
                      <p className="font-semibold text-slate-900">
                        {item.code} - {item.name}
                      </p>
                      <p className="text-orange-700">
                        Expired: {item.expiredDate}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {twelveMonthItems.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold text-pink-700">
                  Produk Akan Expired Dalam 6–12 Bulan
                </h3>

                <div className="space-y-2">
                  {twelveMonthItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-pink-100 bg-pink-50 p-3 text-sm"
                    >
                      <p className="font-semibold text-slate-900">
                        {item.code} - {item.name}
                      </p>
                      <p className="text-pink-700">
                        Expired: {item.expiredDate}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-6 w-full rounded-xl bg-pink-500 py-3 font-bold text-white hover:bg-pink-600"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}