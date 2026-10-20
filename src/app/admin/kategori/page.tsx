"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
  id: number;
  name: string;
  parentId: number | null;
  children: Category[];
};

type FormState = {
  name: string;
  parentId: string;
};

const emptyForm: FormState = {
  name: "",
  parentId: "",
};

export default function KategoriPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadCategories() {
    const res = await fetch("/api/categories");
    const data = await res.json();

    setCategories(data);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const totalSubCategory = useMemo(() => {
    return categories.reduce((sum, category) => {
      return sum + category.children.length;
    }, 0);
  }, [categories]);

  async function submitCategory(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: form.name,
        parentId: form.parentId,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setMessage(data.message || "Gagal menyimpan kategori");
      return;
    }

    setMessage(
      form.parentId
        ? "Subkategori berhasil ditambahkan"
        : "Kategori utama berhasil ditambahkan"
    );

    setForm(emptyForm);
    loadCategories();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kategori</h1>
        <p className="text-slate-500">
          Kelola 5 kategori utama dan subkategori produk
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Kategori Utama</p>
          <h2 className="mt-2 text-3xl font-bold">{categories.length}</h2>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Subkategori</p>
          <h2 className="mt-2 text-3xl font-bold">{totalSubCategory}</h2>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Struktur</p>
          <h2 className="mt-2 text-3xl font-bold">2 Level</h2>
        </div>
      </div>

      <form
        onSubmit={submitCategory}
        className="rounded-2xl border bg-white p-5 shadow-sm"
      >
        <h2 className="text-xl font-bold">Tambah Kategori / Subkategori</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kosongkan kategori utama jika ingin menambah kategori utama baru.
          Pilih kategori utama jika ingin menambah subkategori.
        </p>

        {message && (
          <div className="mt-4 rounded-xl bg-slate-100 p-3 text-sm">
            {message}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="mb-1 block text-sm font-medium">
              Induk Kategori
            </label>

            <select
              value={form.parentId}
              onChange={(e) =>
                setForm({
                  ...form,
                  parentId: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="">Kategori Utama Baru</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  Subkategori dari {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">
              Nama Kategori / Subkategori
            </label>

            <input
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Contoh: Sunscreen / Lip Tint / Hijab"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            disabled={loading}
            className="rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Daftar Kategori dan Subkategori</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kategori utama hanya 5, lalu jenis produk masuk sebagai subkategori.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4">
          {categories.length === 0 && (
            <div className="rounded-xl border bg-slate-50 p-4 text-center text-slate-500">
              Belum ada kategori.
            </div>
          )}

          {categories.map((category) => (
            <div key={category.id} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-lg font-bold">{category.name}</h3>
                  <p className="text-sm text-slate-500">
                    {category.children.length} subkategori
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                  Kategori Utama
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {category.children.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Belum ada subkategori.
                  </p>
                )}

                {category.children.map((subCategory) => (
                  <span
                    key={subCategory.id}
                    className="rounded-full border bg-slate-50 px-3 py-2 text-sm"
                  >
                    {subCategory.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}