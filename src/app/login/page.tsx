"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  message?: string;
  user?: {
    id: number;
    name: string;
    username: string;
    role: "ADMIN" | "KASIR";
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await res.text();

        console.error("LOGIN_NON_JSON_RESPONSE:", {
          status: res.status,
          contentType,
          responseStart: text.slice(0, 300),
        });

        setMessage(
          `Login gagal. API login mengembalikan response tidak valid. Status: ${res.status}`
        );

        return;
      }

      const data = (await res.json()) as LoginResponse;

      if (!res.ok) {
        setMessage(data.message || "Login gagal.");
        return;
      }

      if (!data.user) {
        setMessage("Login gagal. Data user tidak ditemukan.");
        return;
      }

      router.push(data.user.role === "ADMIN" ? "/admin/dashboard" : "/kasir");
      router.refresh();
    } catch (error) {
      console.error("LOGIN_CLIENT_ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat proses login."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-100 p-6">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-2xl shadow-pink-100/70">
        <div className="bg-gradient-to-r from-pink-500 to-rose-400 px-8 py-7 text-white">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-pink-100">
            Point of Sale
          </p>

          <h1 className="mt-2 text-3xl font-bold">Leona Store</h1>

          <p className="mt-2 text-sm text-pink-50">
            Masuk untuk mengelola kasir, stok, transaksi, dan laporan toko.
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Username
              </label>

              <input
                className="w-full rounded-xl border border-pink-100 bg-pink-50/40 px-4 py-3 text-slate-900 outline-none focus:border-pink-400 focus:bg-white"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <input
                type="password"
                className="w-full rounded-xl border border-pink-100 bg-pink-50/40 px-4 py-3 text-slate-900 outline-none focus:border-pink-400 focus:bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
              />
            </div>

            {message && (
              <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-pink-600 py-3 font-semibold text-white shadow-lg shadow-pink-200 transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Login"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">
            Sistem internal Leona Store.
          </p>
        </div>
      </div>
    </main>
  );
}