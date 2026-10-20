"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";

type Product = {
  id: number;
  code: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  sellingPrice: number;
  stock: number;
  category: {
    id: number;
    name: string;
  };
  subCategory?: {
    id: number;
    name: string;
  } | null;
};

type CartItem = Product & {
  quantity: number;
  itemDiscountPercent: number;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function clampPercent(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(value, 100));
}

function calculateDiscountAmount(price: number, percent: number) {
  return Math.round(price * (clampPercent(percent) / 100));
}

export default function KasirPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paid, setPaid] = useState("");
  const [transactionDiscountPercent, setTransactionDiscountPercent] =
    useState("0");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadProducts(search = "") {
    const res = await fetch(`/api/products?q=${search}`);
    const data = await res.json();

    setProducts(data);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const subtotalBeforeDiscount = useMemo(() => {
    return cart.reduce((sum, item) => {
      return sum + item.sellingPrice * item.quantity;
    }, 0);
  }, [cart]);

  const itemDiscountTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const discountPerItem = calculateDiscountAmount(
        item.sellingPrice,
        item.itemDiscountPercent
      );

      return sum + discountPerItem * item.quantity;
    }, 0);
  }, [cart]);

  const totalAfterItemDiscount = Math.max(
    subtotalBeforeDiscount - itemDiscountTotal,
    0
  );

  const transactionDiscountAmount = Math.round(
    totalAfterItemDiscount *
      (clampPercent(Number(transactionDiscountPercent || 0)) / 100)
  );

  const grandTotal = Math.max(
    totalAfterItemDiscount - transactionDiscountAmount,
    0
  );

  const change = Number(paid || 0) - grandTotal;

  function addToCart(product: Product) {
    setMessage("");

    if (product.stock <= 0) {
      setMessage("Stok produk habis.");
      return;
    }

    setCart((current) => {
      const found = current.find((item) => item.id === product.id);

      if (found) {
        if (found.quantity >= product.stock) {
          setMessage("Jumlah produk melebihi stok tersedia.");
          return current;
        }

        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          quantity: 1,
          itemDiscountPercent: 0,
        },
      ];
    });
  }

  function removeFromCart(id: number) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  function updateQty(id: number, qty: number) {
    setCart((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          quantity: Math.max(1, Math.min(qty || 1, item.stock)),
        };
      })
    );
  }

  function updateDiscountPercent(id: number, value: number) {
    setCart((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          itemDiscountPercent: clampPercent(value || 0),
        };
      })
    );
  }

  async function submitSale() {
    setMessage("");

    if (cart.length === 0) {
      setMessage("Keranjang masih kosong.");
      return;
    }

    if (Number(paid || 0) < grandTotal) {
      setMessage("Uang bayar kurang.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          paymentMethod,
          transactionDiscountPercent: clampPercent(
            Number(transactionDiscountPercent || 0)
          ),
          paid: Number(paid || 0),
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            itemDiscountPercent: clampPercent(item.itemDiscountPercent),
          })),
        }),
      });

      const data = await readJsonSafe(res);

      setLoading(false);

      if (!res.ok) {
        setMessage(data.message || "Transaksi gagal.");
        return;
      }

      router.push(`/nota/${data.id}`);
    } catch (error) {
      setLoading(false);
      setMessage("Terjadi kesalahan koneksi saat menyimpan transaksi.");
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();

    await loadProducts(q);
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <section className="col-span-12 space-y-4 xl:col-span-8">
        <div className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm shadow-pink-100/70">
          <p className="text-sm font-semibold uppercase tracking-wide text-pink-500">
            Leona Store
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">Kasir</h1>

          <p className="mt-1 text-slate-500">
            Cari produk berdasarkan nama, kode, brand, kategori, atau
            subkategori.
          </p>
        </div>

        <form
          onSubmit={search}
          className="flex flex-col gap-2 rounded-2xl border border-pink-100 bg-white p-3 shadow-sm md:flex-row"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-xl border border-pink-100 bg-pink-50/40 px-4 py-3 focus:border-pink-400 focus:bg-white"
            placeholder="Cari nama/kode produk..."
            autoFocus
          />

          <button className="rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white hover:bg-pink-600">
            Cari
          </button>
        </form>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {products.length === 0 && (
            <div className="col-span-full rounded-2xl border border-pink-100 bg-white p-6 text-center text-slate-500">
              Produk tidak ditemukan.
            </div>
          )}

          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => addToCart(product)}
              className="overflow-hidden rounded-2xl border border-pink-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-pink-400 hover:shadow-md"
            >
              <div className="h-28 w-full bg-pink-50">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-pink-300">
                    Tidak ada gambar
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="text-xs font-semibold text-pink-500">
                  {product.code}
                </p>

                <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                  {product.name}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {product.brand || "-"}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {product.category?.name || "-"} &gt;{" "}
                  {product.subCategory?.name || "-"}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    {formatCurrency(product.sellingPrice)}
                  </p>

                  <p
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      product.stock <= 0
                        ? "bg-red-100 text-red-700"
                        : product.stock <= 5
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-pink-100 text-pink-700"
                    }`}
                  >
                    Stok {product.stock}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="col-span-12 xl:col-span-4">
        <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl border border-pink-200 bg-white shadow-lg shadow-pink-100/70">
          <div className="shrink-0 border-b border-pink-100 bg-pink-500 px-5 py-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-100">
                  Transaksi
                </p>
                <h2 className="text-xl font-bold">Keranjang</h2>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-pink-600">
                {cart.length}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-pink-50/40 p-4">
            {cart.length === 0 && (
              <div className="rounded-2xl border border-dashed border-pink-200 bg-white p-5 text-center">
                <p className="text-sm font-medium text-pink-600">
                  Keranjang kosong
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Klik produk untuk menambahkan ke keranjang.
                </p>
              </div>
            )}

            {cart.map((item) => {
              const discountPerItem = calculateDiscountAmount(
                item.sellingPrice,
                item.itemDiscountPercent
              );

              const subtotal = Math.max(
                (item.sellingPrice - discountPerItem) * item.quantity,
                0
              );

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-pink-100 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                        {item.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.code} • {formatCurrency(item.sellingPrice)}
                      </p>

                      <p className="text-xs text-slate-500">
                        Stok tersedia: {item.stock}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                    >
                      Hapus
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        Qty
                      </label>

                      <input
                        type="number"
                        min={1}
                        max={item.stock}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQty(item.id, Number(e.target.value))
                        }
                        className="w-full rounded-xl border border-pink-100 bg-pink-50/40 px-3 py-2 text-sm focus:border-pink-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        Diskon/item (%)
                      </label>

                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.itemDiscountPercent}
                        onChange={(e) =>
                          updateDiscountPercent(
                            item.id,
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded-xl border border-pink-100 bg-pink-50/40 px-3 py-2 text-sm focus:border-pink-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 rounded-xl bg-pink-50 px-3 py-2">
                    {item.itemDiscountPercent > 0 && (
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          Diskon {item.itemDiscountPercent}% x {item.quantity}
                        </span>
                        <span>
                          -{formatCurrency(discountPerItem * item.quantity)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        Subtotal
                      </span>
                      <span className="text-sm font-bold text-pink-600">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="shrink-0 space-y-3 border-t border-pink-100 bg-white p-4">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-xl border border-pink-100 bg-pink-50/40 px-4 py-2.5 text-sm focus:border-pink-400 focus:bg-white"
              placeholder="Nama pelanggan opsional"
            />

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-pink-100 bg-pink-50/40 px-4 py-2.5 text-sm focus:border-pink-400 focus:bg-white"
            >
              <option value="CASH">Cash</option>
              <option value="QRIS">QRIS</option>
              <option value="TRANSFER">Transfer</option>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={transactionDiscountPercent}
                onChange={(e) =>
                  setTransactionDiscountPercent(
                    String(clampPercent(Number(e.target.value)))
                  )
                }
                className="w-full rounded-xl border border-pink-100 bg-pink-50/40 px-4 py-2.5 text-sm focus:border-pink-400 focus:bg-white"
                placeholder="Diskon trx (%)"
              />

              <input
                type="number"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                className="w-full rounded-xl border border-pink-100 bg-pink-50/40 px-4 py-2.5 text-sm focus:border-pink-400 focus:bg-white"
                placeholder="Uang bayar"
              />
            </div>

            <div className="space-y-1.5 rounded-2xl bg-pink-50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <strong>{formatCurrency(subtotalBeforeDiscount)}</strong>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Diskon Item</span>
                <strong>-{formatCurrency(itemDiscountTotal)}</strong>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  Diskon Transaksi ({clampPercent(Number(transactionDiscountPercent || 0))}%)
                </span>
                <strong>-{formatCurrency(transactionDiscountAmount)}</strong>
              </div>

              <div className="flex justify-between border-t border-pink-200 pt-2 text-lg">
                <span className="font-bold text-slate-900">Grand Total</span>
                <strong className="text-pink-600">
                  {formatCurrency(grandTotal)}
                </strong>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Kembalian</span>
                <strong>{formatCurrency(change > 0 ? change : 0)}</strong>
              </div>
            </div>

            {message && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={submitSale}
              disabled={loading}
              className="w-full rounded-xl bg-pink-500 py-3.5 font-bold text-white hover:bg-pink-600 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan & Cetak Struk"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}