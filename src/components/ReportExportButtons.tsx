"use client";

import { useMemo, useState } from "react";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartOfCurrentMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  return formatDateInput(start);
}

function getToday() {
  return formatDateInput(new Date());
}

export default function ReportExportButtons() {
  const defaultStartDate = getStartOfCurrentMonth();
  const defaultEndDate = getToday();

  const [startDateInput, setStartDateInput] = useState(defaultStartDate);
  const [endDateInput, setEndDateInput] = useState(defaultEndDate);

  const [appliedStartDate, setAppliedStartDate] = useState(defaultStartDate);
  const [appliedEndDate, setAppliedEndDate] = useState(defaultEndDate);

  const isDateChanged =
    startDateInput !== appliedStartDate || endDateInput !== appliedEndDate;

  const isDateValid = startDateInput !== "" && endDateInput !== "";

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      startDate: appliedStartDate,
      endDate: appliedEndDate,
    });

    return params.toString();
  }, [appliedStartDate, appliedEndDate]);

  const excelUrl = useMemo(() => {
    return `/api/reports/monthly-excel?${queryString}`;
  }, [queryString]);

  const pdfUrl = useMemo(() => {
    return `/api/reports/monthly-pdf?${queryString}`;
  }, [queryString]);

  function handleApplyDate() {
    if (!isDateValid) {
      alert("Tanggal mulai dan tanggal akhir wajib diisi.");
      return;
    }

    setAppliedStartDate(startDateInput);
    setAppliedEndDate(endDateInput);
  }

  return (
    <div className="w-full rounded-2xl border border-pink-100 bg-white p-5 shadow-sm shadow-pink-50">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
          Leona Store
        </p>

        <h2 className="mt-1 text-lg font-bold text-slate-900">
          Export Laporan
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Pilih rentang tanggal laporan, lalu klik Terapkan sebelum melakukan
          export.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[180px_180px_120px_160px_160px] md:items-end">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Tanggal Mulai
          </label>

          <input
            type="date"
            value={startDateInput}
            onChange={(event) => setStartDateInput(event.target.value)}
            className="h-11 w-full rounded-xl border border-pink-100 bg-pink-50/40 px-4 text-sm text-slate-900 focus:border-pink-400 focus:bg-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Tanggal Akhir
          </label>

          <input
            type="date"
            value={endDateInput}
            onChange={(event) => setEndDateInput(event.target.value)}
            className="h-11 w-full rounded-xl border border-pink-100 bg-pink-50/40 px-4 text-sm text-slate-900 focus:border-pink-400 focus:bg-white"
          />
        </div>

        <button
          type="button"
          onClick={handleApplyDate}
          disabled={!isDateValid || !isDateChanged}
          className="flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-pink-600 px-4 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Terapkan
        </button>

        <a
          href={excelUrl}
          download
          className="flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Download Excel
        </a>

        <a
          href={pdfUrl}
          download
          className="flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white hover:bg-rose-600"
        >
          Download PDF
        </a>
      </div>

      <div className="mt-3 text-sm text-slate-500">
        Periode aktif:{" "}
        <span className="font-semibold text-slate-800">
          {appliedStartDate} sampai {appliedEndDate}
        </span>

        {isDateChanged && (
          <span className="ml-2 font-medium text-pink-600">
            Tanggal belum diterapkan.
          </span>
        )}
      </div>
    </div>
  );
}