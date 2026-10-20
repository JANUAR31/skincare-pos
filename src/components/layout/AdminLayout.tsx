import Link from "next/link";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

const menus = [
  ["/admin/dashboard", "Dashboard"],
  ["/admin/produk", "Produk"],
  ["/admin/kategori", "Kategori"],
  ["/admin/stok", "Stok Masuk/Keluar"],
  ["/admin/opname", "Stock Opname"],
  ["/admin/riwayat-stok", "Riwayat Stok"],
  ["/admin/transaksi", "Transaksi"],
  ["/admin/laporan", "Laporan"],
  ["/admin/pengaturan", "Pengaturan"],
  ["/kasir", "Kasir"],
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/kasir");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      <aside className="no-print fixed left-0 top-0 h-screen w-64 overflow-y-auto border-r border-pink-100 bg-white text-slate-800 shadow-xl shadow-pink-100/60">
        <div className="border-b border-pink-100 bg-gradient-to-r from-pink-500 to-rose-400 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-100">
            POS System
          </p>

          <h1 className="mt-2 text-2xl font-bold">Leona Store</h1>

          <p className="mt-1 text-sm text-pink-50">
            Admin Dashboard
          </p>
        </div>

        <nav className="space-y-1 p-3">
          {menus.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-pink-50 hover:text-pink-700"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="ml-64 min-h-screen">
        <header className="no-print flex items-center justify-between border-b border-pink-100 bg-white/90 px-6 py-4 shadow-sm backdrop-blur">
          <div>
            <p className="text-sm text-slate-500">Login sebagai</p>

            <h2 className="font-semibold text-slate-900">
              {user.name} ({user.role})
            </h2>
          </div>

          <LogoutButton />
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}