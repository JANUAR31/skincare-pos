import Card from "@/components/Card";
import ReportExportButtons from "@/components/ReportExportButtons";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateOnly } from "@/lib/format";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  return d;
}

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);

  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);

  return d;
}

function twelveMonthsLater() {
  const d = new Date();
  d.setMonth(d.getMonth() + 12);
  d.setHours(23, 59, 59, 999);

  return d;
}

export default async function LaporanPage() {
  const today = startOfToday();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const expiredLimit = twelveMonthsLater();

  const [daily, weekly, monthly, saleItems, products, expired, willExpired] =
    await Promise.all([
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
            gte: weekStart,
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

      prisma.saleItem.findMany({
        include: {
          product: {
            include: {
              category: true,
              subCategory: true,
            },
          },
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
          stock: "asc",
        },
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
      }),

      prisma.product.findMany({
        where: {
          isActive: true,
          expiredDate: {
            gte: today,
            lte: expiredLimit,
          },
        },
        include: {
          category: true,
          subCategory: true,
        },
        orderBy: {
          expiredDate: "asc",
        },
      }),
    ]);

  function sumSales(sales: typeof daily) {
    return {
      count: sales.length,
      omset: sales.reduce((sum, sale) => {
        return sum + sale.grandTotal;
      }, 0),
      laba: sales.reduce((sum, sale) => {
        return (
          sum +
          sale.items.reduce((itemSum, item) => {
            return itemSum + item.profit;
          }, 0)
        );
      }, 0),
    };
  }

  const dailySum = sumSales(daily);
  const weeklySum = sumSales(weekly);
  const monthlySum = sumSales(monthly);

  const byProduct = new Map<
    number,
    {
      name: string;
      code: string;
      category: string;
      subCategory: string;
      qty: number;
      omset: number;
    }
  >();

  const byCategory = new Map<string, number>();

  for (const item of saleItems) {
    const productData = byProduct.get(item.productId) || {
      name: item.productName,
      code: item.productCode,
      category: item.product?.category?.name || "-",
      subCategory: item.product?.subCategory?.name || "-",
      qty: 0,
      omset: 0,
    };

    productData.qty += item.quantity;
    productData.omset += item.subtotal;

    byProduct.set(item.productId, productData);

    const categoryName = item.product?.category?.name || "-";

    byCategory.set(
      categoryName,
      (byCategory.get(categoryName) || 0) + item.subtotal
    );
  }

  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  const slowProducts = products
    .filter((product) => {
      return !byProduct.has(product.id);
    })
    .slice(0, 10);

  const lowStock = products.filter((product) => {
    return product.stock <= product.minStock;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Laporan</h1>
          <p className="text-slate-500">
            Penjualan, stok, expired 12 bulan, laba rugi, dan performa produk
          </p>
        </div>

        <ReportExportButtons />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Penjualan Harian</p>
          <h2 className="mt-2 text-2xl font-bold">
            {formatCurrency(dailySum.omset)}
          </h2>
          <p className="text-sm">Laba: {formatCurrency(dailySum.laba)}</p>
          <p className="text-sm text-slate-500">
            {dailySum.count} transaksi
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Penjualan Mingguan</p>
          <h2 className="mt-2 text-2xl font-bold">
            {formatCurrency(weeklySum.omset)}
          </h2>
          <p className="text-sm">Laba: {formatCurrency(weeklySum.laba)}</p>
          <p className="text-sm text-slate-500">
            {weeklySum.count} transaksi
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Penjualan Bulanan</p>
          <h2 className="mt-2 text-2xl font-bold">
            {formatCurrency(monthlySum.omset)}
          </h2>
          <p className="text-sm">Laba: {formatCurrency(monthlySum.laba)}</p>
          <p className="text-sm text-slate-500">
            {monthlySum.count} transaksi
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Produk Terlaris">
          <table className="w-full text-sm">
            <tbody>
              {topProducts.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500">Belum ada data.</td>
                </tr>
              )}

              {topProducts.map((product) => (
                <tr key={product.code} className="border-t">
                  <td className="py-2">
                    <p className="font-medium">
                      {product.code} - {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.category} &gt; {product.subCategory}
                    </p>
                  </td>

                  <td className="py-2 text-right">{product.qty} terjual</td>

                  <td className="py-2 text-right">
                    {formatCurrency(product.omset)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Produk Kurang Laku">
          <table className="w-full text-sm">
            <tbody>
              {slowProducts.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500">
                    Belum ada produk kurang laku.
                  </td>
                </tr>
              )}

              {slowProducts.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="py-2">
                    <p className="font-medium">
                      {product.code} - {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.category?.name || "-"} &gt;{" "}
                      {product.subCategory?.name || "-"}
                    </p>
                  </td>

                  <td className="py-2 text-right">0 terjual</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="Omset Per Kategori Utama">
        <table className="w-full text-sm">
          <tbody>
            {[...byCategory.entries()].length === 0 && (
              <tr>
                <td className="py-3 text-slate-500">Belum ada data.</td>
              </tr>
            )}

            {[...byCategory.entries()].map(([category, value]) => (
              <tr key={category} className="border-t">
                <td className="py-2">{category}</td>
                <td className="py-2 text-right font-semibold">
                  {formatCurrency(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Stok Saat Ini">
          <table className="w-full text-sm">
            <tbody>
              {products.slice(0, 20).map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="py-2">
                    <p className="font-medium">
                      {product.code} - {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.category?.name || "-"} &gt;{" "}
                      {product.subCategory?.name || "-"}
                    </p>
                  </td>

                  <td className="py-2 text-right">{product.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Stok Menipis">
          <table className="w-full text-sm">
            <tbody>
              {lowStock.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500">
                    Tidak ada stok menipis.
                  </td>
                </tr>
              )}

              {lowStock.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="py-2">
                    <p className="font-medium">
                      {product.code} - {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.category?.name || "-"} &gt;{" "}
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Produk Akan Expired 12 Bulan">
          <table className="w-full text-sm">
            <tbody>
              {willExpired.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500">
                    Tidak ada produk akan expired 12 bulan.
                  </td>
                </tr>
              )}

              {willExpired.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="py-2">
                    <p className="font-medium">
                      {product.code} - {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.category?.name || "-"} &gt;{" "}
                      {product.subCategory?.name || "-"}
                    </p>
                  </td>

                  <td className="py-2 text-right">
                    {product.expiredDate
                      ? formatDateOnly(product.expiredDate)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Produk Expired">
          <table className="w-full text-sm">
            <tbody>
              {expired.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500">
                    Tidak ada produk expired.
                  </td>
                </tr>
              )}

              {expired.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="py-2">
                    <p className="font-medium">
                      {product.code} - {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.category?.name || "-"} &gt;{" "}
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
      </div>
    </div>
  );
}