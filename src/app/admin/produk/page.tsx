"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatDateOnly } from "@/lib/format";

type Category = {
  id: number;
  name: string;
  parentId: number | null;
  children: Category[];
};

type Product = {
  id: number;
  code: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  categoryId: number;
  subCategoryId?: number | null;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  batchNumber?: string | null;
  expiredDate?: string | null;
  category: {
    id: number;
    name: string;
  };
  subCategory?: {
    id: number;
    name: string;
  } | null;
};

type FormState = {
  id?: number;
  code: string;
  name: string;
  brand: string;
  imageUrl: string;
  categoryId: string;
  subCategoryId: string;
  purchasePrice: string;
  sellingPrice: string;
  stock: string;
  minStock: string;
  batchNumber: string;
  expiredDate: string;
};

const emptyForm: FormState = {
  code: "",
  name: "",
  brand: "",
  imageUrl: "",
  categoryId: "",
  subCategoryId: "",
  purchasePrice: "",
  sellingPrice: "",
  stock: "",
  minStock: "",
  batchNumber: "",
  expiredDate: "",
};

function toDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadProducts(search = "") {
    const res = await fetch(`/api/products?q=${search}`);
    const data = await res.json();

    setProducts(data);
  }

  async function loadCategories() {
    const res = await fetch("/api/categories");
    const data = await res.json();

    setCategories(data);
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const selectedCategory = useMemo(() => {
    return categories.find((category) => {
      return String(category.id) === form.categoryId;
    });
  }, [categories, form.categoryId]);

  const subCategories = selectedCategory?.children || [];

  function resetForm() {
    setForm(emptyForm);
    setMessage("");
  }

  function editProduct(product: Product) {
    setMessage("");

    setForm({
      id: product.id,
      code: product.code,
      name: product.name,
      brand: product.brand || "",
      imageUrl: product.imageUrl || "",
      categoryId: String(product.categoryId || ""),
      subCategoryId: product.subCategoryId ? String(product.subCategoryId) : "",
      purchasePrice: String(product.purchasePrice || 0),
      sellingPrice: String(product.sellingPrice || 0),
      stock: String(product.stock || 0),
      minStock: String(product.minStock || 0),
      batchNumber: product.batchNumber || "",
      expiredDate: toDateInput(product.expiredDate),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function submitProduct(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    const payload = {
      code: form.code,
      name: form.name,
      brand: form.brand,
      imageUrl: form.imageUrl,
      categoryId: form.categoryId,
      subCategoryId: form.subCategoryId,
      purchasePrice: Number(form.purchasePrice || 0),
      sellingPrice: Number(form.sellingPrice || 0),
      stock: Number(form.stock || 0),
      minStock: Number(form.minStock || 0),
      batchNumber: form.batchNumber,
      expiredDate: form.expiredDate,
    };

    const url = form.id ? `/api/products/${form.id}` : "/api/products";
    const method = form.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setMessage(data.message || "Gagal menyimpan produk");
      return;
    }

    setMessage(form.id ? "Produk berhasil diperbarui" : "Produk berhasil ditambahkan");
    resetForm();
    loadProducts(q);
  }

  async function deleteProduct(id: number) {
    const yakin = confirm("Yakin ingin menghapus produk ini?");

    if (!yakin) {
      return;
    }

    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Gagal menghapus produk");
      return;
    }

    loadProducts(q);
  }

  async function searchProduct(e: React.FormEvent) {
    e.preventDefault();

    await loadProducts(q);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Produk</h1>
        <p className="text-slate-500">
          Kelola produk berdasarkan kategori utama dan subkategori
        </p>
      </div>

      <form
        onSubmit={submitProduct}
        className="rounded-2xl border bg-white p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {form.id ? "Edit Produk" : "Tambah Produk"}
            </h2>
            <p className="text-sm text-slate-500">
              Isi data produk, kategori, stok, harga, batch, dan expired
            </p>
          </div>

          {form.id && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Batal Edit
            </button>
          )}
        </div>

        {message && (
          <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Kode Produk
            </label>
            <input
              value={form.code}
              onChange={(e) =>
                setForm({
                  ...form,
                  code: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Contoh: SKN001"
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">
              Nama Produk
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
              placeholder="Nama produk"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Brand</label>
            <input
              value={form.brand}
              onChange={(e) =>
                setForm({
                  ...form,
                  brand: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Contoh: Wardah"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Kategori Utama
            </label>
            <select
              value={form.categoryId}
              onChange={(e) =>
                setForm({
                  ...form,
                  categoryId: e.target.value,
                  subCategoryId: "",
                })
              }
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="">Pilih kategori</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Subkategori
            </label>
            <select
              value={form.subCategoryId}
              onChange={(e) =>
                setForm({
                  ...form,
                  subCategoryId: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
              disabled={!form.categoryId}
            >
              <option value="">
                {form.categoryId ? "Pilih subkategori" : "Pilih kategori dulu"}
              </option>

              {subCategories.map((subCategory) => (
                <option key={subCategory.id} value={subCategory.id}>
                  {subCategory.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Harga Beli
            </label>
            <input
              type="number"
              value={form.purchasePrice}
              onChange={(e) =>
                setForm({
                  ...form,
                  purchasePrice: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Harga Jual
            </label>
            <input
              type="number"
              value={form.sellingPrice}
              onChange={(e) =>
                setForm({
                  ...form,
                  sellingPrice: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Stok</label>
            <input
              type="number"
              value={form.stock}
              onChange={(e) =>
                setForm({
                  ...form,
                  stock: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Min Stok</label>
            <input
              type="number"
              value={form.minStock}
              onChange={(e) =>
                setForm({
                  ...form,
                  minStock: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Nomor Batch
            </label>
            <input
              value={form.batchNumber}
              onChange={(e) =>
                setForm({
                  ...form,
                  batchNumber: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Contoh: BATCH001"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Tanggal Expired
            </label>
            <input
              type="date"
              value={form.expiredDate}
              onChange={(e) =>
                setForm({
                  ...form,
                  expiredDate: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">
              URL Gambar
            </label>
            <input
              value={form.imageUrl}
              onChange={(e) =>
                setForm({
                  ...form,
                  imageUrl: e.target.value,
                })
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border px-5 py-3"
          >
            Reset
          </button>

          <button
            disabled={loading}
            className="rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading
              ? "Menyimpan..."
              : form.id
              ? "Update Produk"
              : "Simpan Produk"}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Daftar Produk</h2>
            <p className="text-sm text-slate-500">
              Total produk aktif: {products.length}
            </p>
          </div>

          <form onSubmit={searchProduct} className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-72 rounded-xl border px-4 py-3"
              placeholder="Cari nama, kode, atau brand..."
            />

            <button className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">
              Cari
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="p-3">Gambar</th>
                <th className="p-3">Kode</th>
                <th className="p-3">Produk</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Subkategori</th>
                <th className="p-3 text-right">Harga Beli</th>
                <th className="p-3 text-right">Harga Jual</th>
                <th className="p-3 text-right">Stok</th>
                <th className="p-3">Batch</th>
                <th className="p-3">Expired</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {products.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-slate-500" colSpan={11}>
                    Belum ada produk.
                  </td>
                </tr>
              )}

              {products.map((product) => (
                <tr key={product.id} className="border-b">
                  <td className="p-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                          No Img
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="p-3 font-semibold">{product.code}</td>

                  <td className="p-3">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {product.brand || "-"}
                    </p>
                  </td>

                  <td className="p-3">{product.category?.name || "-"}</td>

                  <td className="p-3">{product.subCategory?.name || "-"}</td>

                  <td className="p-3 text-right">
                    {formatCurrency(product.purchasePrice)}
                  </td>

                  <td className="p-3 text-right">
                    {formatCurrency(product.sellingPrice)}
                  </td>

                  <td className="p-3 text-right">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        product.stock <= product.minStock
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>

                  <td className="p-3">{product.batchNumber || "-"}</td>

                  <td className="p-3">
                    {product.expiredDate
                      ? formatDateOnly(product.expiredDate)
                      : "-"}
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => editProduct(product)}
                        className="rounded-lg border px-3 py-2 text-xs"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs text-white"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}