import Link from "next/link";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function KasirLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      <header className="no-print flex items-center justify-between border-b border-pink-100 bg-white/90 px-6 py-4 shadow-sm backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-500">
            Leona Store
          </p>

          <h1 className="mt-1 text-xl font-bold text-slate-900">
            Kasir Penjualan
          </h1>

          <p className="text-sm text-slate-500">
            Login sebagai {user.name} ({user.role})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user.role === "ADMIN" && (
            <Link
              href="/admin/dashboard"
              className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-100"
            >
              Admin
            </Link>
          )}

          <LogoutButton />
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}