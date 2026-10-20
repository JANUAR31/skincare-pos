import Card from "@/components/Card";
import ExpiredReminderPopup from "@/components/ExpiredReminderPopup";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateOnly } from "@/lib/format";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);

  return d;
}

function addMonths(month: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + month);
  d.setHours(23, 59, 59, 999);

  return d;
}

function toPopupItems(
  products: {
    id: number;
    code: string;
    name: string;
    expiredDate: Date | null;
  }[]
) {
  return products.slice(0, 5).map((product) => ({
    id: product.id,
    code: product.code,
    name: product.name,
    expiredDate: product.expiredDate
      ? formatDateOnly(product.expiredDate)
      : "-",
  }));
}

export default async function DashboardPage() {
  const today = startOfToday();
  const monthStart = startOfMonth();
  const sixMonthLimit = addMonths(6);
  const twelveMonthLimit = addMonths(12);

  const [
    todaySales,
    monthSales,
    products,
    lowStockProducts,
    expiredProducts,
    expiredSixMonthProducts,
    expiredTwelveMonthProducts,
    topSaleItems,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: {
        createdAt: {
          gte: today,
        },
      },
      include: {
        items: true,
      },
    }),

    prisma.sale.findMany({
      where: {
        createdAt: {
          gte: monthStart,
        },
      },
      include: {
        items: true,
      },
    }),

    prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: true,
        subCategory: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.product.findMany({
      where: {
        isActive: true,
        stock: {
          lte: prisma.product.fields.minStock,
        },
      },
      include: {
        category: true,
        subCategory: true,
      },
      orderBy: {
        stock: "asc",
      },
      take: 10,
    }),

    prisma.product.findMany({
      where: {
        isActive: true,
        expiredDate: {
          lt: today,
        },
      },
      include: {
        category: true,
        subCategory: true,
      },
      orderBy: {
        expiredDate: "asc",
      },
      take: 10,
    }),

    prisma.product.findMany({
      where: {
        isActive: true,
        expiredDate: {
          gte: today,
          lte: sixMonthLimit,
        },
      },
      include: {
        category: true,
        subCategory: true,
      },
      orderBy: {
        expiredDate: "asc",
      },
      take: 10,
    }),

    prisma.product.findMany({
      where: {
        isActive: true,
        expiredDate: {
          gt: sixMonthLimit,
          lte: twelveMonthLimit,
        },
      },
      include: {
        category: true,
        subCategory: true,
      },
      orderBy: {
        expiredDate: "asc",
      },
      take: 10,
    }),

    prisma.saleItem.findMany({
      include: {
        product: {
          include: {
            category: true,
            subCategory: true,
          },
        },
      },
      orderBy: {
        quantity: "desc",
      },
      take: 20,
    }),
  ]);

  const todayOmset = todaySales.reduce((sum, sale) => {
    return sum + sale.grandTotal;
  }, 0);

  const todayProfit = todaySales.reduce((sum, sale) => {
    return (
      sum +
      sale.items.reduce((itemSum, item) => {
        return itemSum + item.profit;
      }, 0)
    );
  }, 0);

  const monthOmset = monthSales.reduce((sum, sale) => {
    return sum + sale.grandTotal;
  }, 0);

  const monthProfit = monthSales.reduce((sum, sale) => {
    return (
      sum +
      sale.items.reduce((itemSum, item) => {
        return itemSum + item.profit;
      }, 0)
    );
  }, 0);

  const topProductsMap = new Map<
    number,
    {
      code: string;
      name: string;
      category: string;
      subCategory: string;
      quantity: number;
      omset: number;
    }
  >();

  for (const item of topSaleItems) {
    const current = topProductsMap.get(item.productId) || {
      code: item.productCode,
      name: item.productName,
      category: item.product?.category?.name || "-",
      subCategory: item.product?.subCategory?.name || "-",
      quantity: 0,
      omset: 0,
    };

    current.quantity += item.quantity;
    current.omset += item.subtotal;

    topProductsMap.set(item.productId, current);
  }

  const topProducts = [...topProductsMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const expiredWarningCount =
    expiredProducts.length +
    expiredSixMonthProducts.length +
    expiredTwelveMonthProducts.length;

  return (
    <div className="space-y-6">
      <ExpiredReminderPopup
        expiredCount={expiredProducts.length}
        sixMonthCount={expiredSixMonthProducts.length}
        twelveMonthCount={expiredTwelveMonthProducts.length}
        expiredItems={toPopupItems(expiredProducts)}
        sixMonthItems={toPopupItems(expiredSixMonthProducts)}
        twelveMonthItems={toPopupItems(expiredTwelveMonthProducts)}
      />

      <div className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm shadow-pink-100/70">
        <p className="text-sm font-semibold uppercase tracking-wide text-pink-500">
          Leona Store
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">Dashboard</h1>

        <p className="mt-1 text-slate-500">
          Ringkasan penjualan, stok, produk terlaris, dan peringatan expired.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Omset Hari Ini</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(todayOmset)}
          </h2>
          <p className="text-sm text-slate-500">
            Laba: {formatCurrency(todayProfit)}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Omset Bulan Ini</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(monthOmset)}
          </h2>
          <p className="text-sm text-slate-500">
            Laba: {formatCurrency(monthProfit)}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Total Produk Aktif</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {products.length}
          </h2>
          <p className="text-sm text-slate-500">Produk dalam database</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Peringatan Expired</p>
          <h2
            className={`mt-2 text-2xl font-bold ${
              expiredWarningCount > 0 ? "text-pink-600" : "text-slate-900"
            }`}
          >
            {expiredWarningCount}
          </h2>
          <p className="text-sm text-slate-500">
            Expired, 6 bulan, dan 12 bulan
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Produk Sudah Expired">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Produk</th>
                <th className="py-2">Kategori</th>
                <th className="py-2 text-right">Expired</th>
              </tr>
            </thead>

            <tbody>
              {expiredProducts.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={3}>
                    Tidak ada produk expired.
                  </td>
                </tr>
              )}

              {expiredProducts.map((product) => (
                <tr key={product.id} className="border-b">
                  <td className="py-2">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.code}</p>
                  </td>

                  <td className="py-2">
                    <p>{product.category?.name || "-"}</p>
                    <p className="text-xs text-slate-500">
                      {product.subCategory?.name || "-"}
                    </p>
                  </td>

                  <td className="py-2 text-right text-red-600">
                    {product.expiredDate
                      ? formatDateOnly(product.expiredDate)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Expired ≤ 6 Bulan">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Produk</th>
                <th className="py-2">Kategori</th>
                <th className="py-2 text-right">Expired</th>
              </tr>
            </thead>

            <tbody>
              {expiredSixMonthProducts.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={3}>
                    Tidak ada produk akan expired dalam 6 bulan.
                  </td>
                </tr>
              )}

              {expiredSixMonthProducts.map((product) => (
                <tr key={product.id} className="border-b">
                  <td className="py-2">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.code}</p>
                  </td>

                  <td className="py-2">
                    <p>{product.category?.name || "-"}</p>
                    <p className="text-xs text-slate-500">
                      {product.subCategory?.name || "-"}
                    </p>
                  </td>

                  <td className="py-2 text-right text-orange-600">
                    {product.expiredDate
                      ? formatDateOnly(product.expiredDate)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Expired 6–12 Bulan">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Produk</th>
                <th className="py-2">Kategori</th>
                <th className="py-2 text-right">Expired</th>
              </tr>
            </thead>

            <tbody>
              {expiredTwelveMonthProducts.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={3}>
                    Tidak ada produk akan expired 6 sampai 12 bulan.
                  </td>
                </tr>
              )}

              {expiredTwelveMonthProducts.map((product) => (
                <tr key={product.id} className="border-b">
                  <td className="py-2">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.code}</p>
                  </td>

                  <td className="py-2">
                    <p>{product.category?.name || "-"}</p>
                    <p className="text-xs text-slate-500">
                      {product.subCategory?.name || "-"}
                    </p>
                  </td>

                  <td className="py-2 text-right text-pink-600">
                    {product.expiredDate
                      ? formatDateOnly(product.expiredDate)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Stok Menipis">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Produk</th>
                <th className="py-2">Kategori</th>
                <th className="py-2 text-right">Stok</th>
              </tr>
            </thead>

            <tbody>
              {lowStockProducts.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={3}>
                    Tidak ada stok menipis.
                  </td>
                </tr>
              )}

              {lowStockProducts.map((product) => (
                <tr key={product.id} className="border-b">
                  <td className="py-2">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.code}</p>
                  </td>

                  <td className="py-2">
                    <p>{product.category?.name || "-"}</p>
                    <p className="text-xs text-slate-500">
                      {product.subCategory?.name || "-"}
                    </p>
                  </td>

                  <td className="py-2 text-right text-red-600">
                    {product.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Produk Terlaris">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Produk</th>
                <th className="py-2">Kategori</th>
                <th className="py-2 text-right">Terjual</th>
                <th className="py-2 text-right">Omset</th>
              </tr>
            </thead>

            <tbody>
              {topProducts.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={4}>
                    Belum ada data penjualan.
                  </td>
                </tr>
              )}

              {topProducts.map((product) => (
                <tr key={product.code} className="border-b">
                  <td className="py-2">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.code}</p>
                  </td>

                  <td className="py-2">
                    <p>{product.category}</p>
                    <p className="text-xs text-slate-500">
                      {product.subCategory}
                    </p>
                  </td>

                  <td className="py-2 text-right">{product.quantity}</td>

                  <td className="py-2 text-right">
                    {formatCurrency(product.omset)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}