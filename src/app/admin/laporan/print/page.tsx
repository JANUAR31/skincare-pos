import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateOnly } from "@/lib/format";

function parseDateParam(value: string | null) {
  if (!value) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function getDateRange(startDateParam: string | null, endDateParam: string | null) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const rawStart = parseDateParam(startDateParam) || defaultStart;
  const rawEnd = parseDateParam(endDateParam) || defaultEnd;

  const start = rawStart <= rawEnd ? rawStart : rawEnd;
  const end = rawStart <= rawEnd ? rawEnd : rawStart;

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const selectedPeriod = `${formatDateOnly(start)} sampai ${formatDateOnly(end)}`;

  return {
    selectedPeriod,
    start,
    end,
  };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date;
}

function addMonths(totalMonth: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + totalMonth);
  date.setHours(23, 59, 59, 999);

  return date;
}

export default async function PrintLaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const params = await searchParams;
  const { selectedPeriod, start, end } = getDateRange(
    params.startDate || null,
    params.endDate || null
  );

  const today = startOfToday();
  const sixMonthLimit = addMonths(6);
  const twelveMonthLimit = addMonths(12);

  const [
    sales,
    saleItems,
    products,
    expired,
    expiredSixMonth,
    expiredTwelveMonth,
    setting,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
        user: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.saleItem.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
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
    }),

    prisma.storeSetting.findUnique({
      where: {
        id: 1,
      },
    }),
  ]);

  const totalOmset = sales.reduce((sum, sale) => {
    return sum + sale.grandTotal;
  }, 0);

  const totalLaba = saleItems.reduce((sum, item) => {
    return sum + item.profit;
  }, 0);

  const totalDiskonItem = sales.reduce((sum, sale) => {
    return sum + sale.itemDiscountTotal;
  }, 0);

  const totalDiskonTransaksi = sales.reduce((sum, sale) => {
    return sum + sale.transactionDiscount;
  }, 0);

  const totalDiskon = totalDiskonItem + totalDiskonTransaksi;

  const byProduct = new Map<
    number,
    {
      code: string;
      name: string;
      category: string;
      qty: number;
      omset: number;
      laba: number;
    }
  >();

  const byCategory = new Map<
    string,
    {
      qty: number;
      omset: number;
      laba: number;
    }
  >();

  for (const item of saleItems) {
    const categoryName = item.product?.category?.name || "-";

    const productData = byProduct.get(item.productId) || {
      code: item.productCode,
      name: item.productName,
      category: categoryName,
      qty: 0,
      omset: 0,
      laba: 0,
    };

    productData.qty += item.quantity;
    productData.omset += item.subtotal;
    productData.laba += item.profit;

    byProduct.set(item.productId, productData);

    const categoryData = byCategory.get(categoryName) || {
      qty: 0,
      omset: 0,
      laba: 0,
    };

    categoryData.qty += item.quantity;
    categoryData.omset += item.subtotal;
    categoryData.laba += item.profit;

    byCategory.set(categoryName, categoryData);
  }

  const topProducts = [...byProduct.values()]
    .sort((a, b) => {
      return b.qty - a.qty;
    })
    .slice(0, 10);

  const categoryReports = [...byCategory.entries()].sort((a, b) => {
    return b[1].omset - a[1].omset;
  });

  const lowStock = products
    .filter((product) => {
      return product.stock <= product.minStock;
    })
    .slice(0, 10);

  const expiredWarning = [
    ...expired,  
    ...expiredSixMonth,
    ...expiredTwelveMonth,
  ].slice(0, 15);

  return (
    <>
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            width: 100%;
            min-width: 0;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
          }

          body::before,
          body::after {
            display: none !important;
            content: none !important;
          }

          .print-root {
            width: 100%;
            min-height: 100vh;
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
          }

          .print-toolbar {
            max-width: 980px;
            margin: 0 auto;
            padding: 20px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border-bottom: 1px solid #e5e7eb;
            background: #ffffff;
          }

          .print-toolbar h1 {
            margin: 0;
            font-size: 22px;
            line-height: 1.25;
            font-weight: 700;
          }

          .print-toolbar p {
            margin: 4px 0 0 0;
            font-size: 13px;
            color: #64748b;
          }

          .print-actions {
            display: flex;
            gap: 8px;
          }

          .back-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            color: #0f172a;
            padding: 10px 18px;
            border-radius: 10px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
          }

          .report-document {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 11mm 12mm;
            background: #ffffff;
            color: #111827;
          }

          .report-header {
            text-align: center;
          }

          .report-header h1 {
            margin: 0;
            font-size: 16px;
            line-height: 1.25;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          .report-header h2 {
            margin: 4px 0 0 0;
            font-size: 13px;
            line-height: 1.25;
            font-weight: 700;
          }

          .report-header p {
            margin: 2px 0 0 0;
            font-size: 10px;
            line-height: 1.25;
          }

          .report-divider {
            margin: 10px 0;
            border-top: 1.5px solid #111827;
          }

          .report-info {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 10px;
          }

          .report-info td {
            padding: 2px 0;
            vertical-align: top;
          }

          .info-label {
            width: 105px;
            font-weight: 700;
          }

          .report-section {
            margin-top: 12px;
            break-inside: auto;
            page-break-inside: auto;
          }

          .section-title {
            margin: 0 0 7px 0;
            font-size: 12px;
            line-height: 1.25;
            font-weight: 700;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 4px;
          }

          .summary-card {
            border: 1px solid #111827;
            padding: 8px;
            min-height: 52px;
            background: #ffffff;
          }

          .summary-card span {
            display: block;
            margin-bottom: 4px;
            font-size: 9.5px;
            color: #475569;
          }

          .summary-card strong {
            display: block;
            font-size: 14px;
            line-height: 1.2;
          }

          .report-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 8px;
            font-size: 9px;
            line-height: 1.25;
            background: #ffffff;
          }

          .report-table th,
          .report-table td {
            border: 1px solid #111827;
            padding: 4px 5px;
            vertical-align: top;
            word-break: normal;
            overflow-wrap: anywhere;
          }

          .report-table th {
            background: #f3f4f6;
            font-weight: 700;
            text-align: center;
          }

          .text-center {
            text-align: center;
          }

          .text-right {
            text-align: right;
            white-space: nowrap;
          }

          .product-name {
            font-weight: 500;
          }

          .report-note {
            margin: -2px 0 0 0;
            font-size: 9px;
            line-height: 1.3;
            color: #475569;
          }

          .signature-grid {
            margin-top: 42px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 70px;
            text-align: center;
            font-size: 10px;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .signature-grid p {
            margin: 0;
          }

          .signature-line {
            margin-top: 60px !important;
            border-top: 1px solid #111827;
            padding-top: 5px;
          }

          .page-number {
            margin-top: 12px;
            text-align: center;
            font-size: 9px;
            color: #64748b;
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm;
            }

            html,
            body {
              width: 100% !important;
              min-width: 0 !important;
              max-width: none !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body * {
              visibility: hidden !important;
            }

            .print-root,
            .print-root * {
              visibility: visible !important;
            }

            .no-print,
            .no-print * {
              display: none !important;
              visibility: hidden !important;
            }

            .print-root {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              min-width: 0 !important;
              max-width: none !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            .report-document {
              width: 100% !important;
              max-width: none !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              border: none !important;
            }

            .report-section {
              margin-top: 10px !important;
              break-inside: auto;
              page-break-inside: auto;
            }

            .report-table {
              width: 100% !important;
            }

            .report-table thead {
              display: table-header-group;
            }

            .report-table tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .summary-card,
            .signature-grid {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        `}
      </style>

      <main className="print-root">
        <div className="print-toolbar no-print">
          <div>
            <h1>Print / Simpan PDF Laporan</h1>
            <p>Periode laporan: {selectedPeriod}</p>
          </div>

          <div className="print-actions">
            <Link href="/admin/laporan" className="back-button">
              Kembali
            </Link>

            <PrintButton label="Print / Simpan PDF" />
          </div>
        </div>

        <section className="report-document">
          <div className="report-header">
            <h1>Laporan Penjualan dan Stok</h1>
            <h2>{setting?.storeName || "Leona Store"}</h2>

            {setting?.address && <p>{setting.address}</p>}
            {setting?.phone && <p>Telp: {setting.phone}</p>}
          </div>

          <div className="report-divider" />

          <table className="report-info">
            <tbody>
              <tr>
                <td className="info-label">Periode</td>
                <td>: {selectedPeriod}</td>
              </tr>
              <tr>
                <td className="info-label">Tanggal Cetak</td>
                <td>: {formatDateOnly(new Date())}</td>
              </tr>
              <tr>
                <td className="info-label">Jenis Laporan</td>
                <td>: Penjualan periode, stok, expired, dan produk</td>
              </tr>
            </tbody>
          </table>

          <div className="report-section">
            <h3 className="section-title">A. Ringkasan Periode</h3>

            <div className="summary-grid">
              <div className="summary-card">
                <span>Jumlah Transaksi</span>
                <strong>{sales.length}</strong>
              </div>

              <div className="summary-card">
                <span>Total Omset</span>
                <strong>{formatCurrency(totalOmset)}</strong>
              </div>

              <div className="summary-card">
                <span>Total Laba</span>
                <strong>{formatCurrency(totalLaba)}</strong>
              </div>

              <div className="summary-card">
                <span>Total Diskon</span>
                <strong>{formatCurrency(totalDiskon)}</strong>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h3 className="section-title">B. Produk Terlaris</h3>

            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: "32px" }}>No</th>
                  <th style={{ width: "64px" }}>Kode</th>
                  <th>Produk</th>
                  <th style={{ width: "82px" }}>Kategori</th>
                  <th style={{ width: "42px" }}>Qty</th>
                  <th style={{ width: "88px" }}>Omset</th>
                  <th style={{ width: "88px" }}>Laba</th>
                </tr>
              </thead>

              <tbody>
                {topProducts.length === 0 && (
                  <tr>
                    <td className="text-center" colSpan={7}>
                      Tidak ada produk terjual.
                    </td>
                  </tr>
                )}

                {topProducts.map((product, index) => (
                  <tr key={`${product.code}-${index}`}>
                    <td className="text-center">{index + 1}</td>
                    <td className="text-center">{product.code}</td>
                    <td className="product-name">{product.name}</td>
                    <td>{product.category}</td>
                    <td className="text-right">{product.qty}</td>
                    <td className="text-right">
                      {formatCurrency(product.omset)}
                    </td>
                    <td className="text-right">
                      {formatCurrency(product.laba)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="report-note">
              Catatan: Produk terlaris ditampilkan maksimal 10 produk.
            </p>
          </div>

          <div className="report-section">
            <h3 className="section-title">C. Omset Per Kategori Utama</h3>

            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: "32px" }}>No</th>
                  <th>Kategori</th>
                  <th style={{ width: "56px" }}>Qty</th>
                  <th style={{ width: "110px" }}>Omset</th>
                  <th style={{ width: "110px" }}>Laba</th>
                </tr>
              </thead>

              <tbody>
                {categoryReports.length === 0 && (
                  <tr>
                    <td className="text-center" colSpan={5}>
                      Tidak ada data kategori.
                    </td>
                  </tr>
                )}

                {categoryReports.map(([category, data], index) => (
                  <tr key={`${category}-${index}`}>
                    <td className="text-center">{index + 1}</td>
                    <td>{category}</td>
                    <td className="text-right">{data.qty}</td>
                    <td className="text-right">
                      {formatCurrency(data.omset)}
                    </td>
                    <td className="text-right">{formatCurrency(data.laba)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="report-section">
            <h3 className="section-title">D. Stok Menipis</h3>

            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: "32px" }}>No</th>
                  <th style={{ width: "64px" }}>Kode</th>
                  <th>Produk</th>
                  <th style={{ width: "90px" }}>Kategori</th>
                  <th style={{ width: "50px" }}>Stok</th>
                </tr>
              </thead>

              <tbody>
                {lowStock.length === 0 && (
                  <tr>
                    <td className="text-center" colSpan={5}>
                      Tidak ada stok menipis.
                    </td>
                  </tr>
                )}

                {lowStock.map((product, index) => (
                  <tr key={`${product.id}-${index}`}>
                    <td className="text-center">{index + 1}</td>
                    <td className="text-center">{product.code}</td>
                    <td className="product-name">{product.name}</td>
                    <td>{product.category?.name || "-"}</td>
                    <td className="text-right">{product.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="report-note">
              Catatan: Stok menipis ditampilkan maksimal 10 produk.
            </p>
          </div>

          <div className="report-section">
            <h3 className="section-title">E. Peringatan Expired</h3>

            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: "32px" }}>No</th>
                  <th style={{ width: "64px" }}>Kode</th>
                  <th>Produk</th>
                  <th style={{ width: "78px" }}>Kategori</th>
                  <th style={{ width: "82px" }}>Expired</th>
                  <th style={{ width: "110px" }}>Status</th>
                </tr>
              </thead>

              <tbody>
                {expiredWarning.length === 0 && (
                  <tr>
                    <td className="text-center" colSpan={6}>
                      Tidak ada produk expired.
                    </td>
                  </tr>
                )}

                {expiredWarning.map((product, index) => {
                  let status = "Expired 6-12 Bulan";

                  if (product.expiredDate && product.expiredDate < today) {
                    status = "Sudah Expired";
                  } else if (
                    product.expiredDate &&
                    product.expiredDate <= sixMonthLimit
                  ) {
                    status = "Expired <= 6 Bulan";
                  }

                  return (
                    <tr key={`${product.id}-${index}`}>
                      <td className="text-center">{index + 1}</td>
                      <td className="text-center">{product.code}</td>
                      <td className="product-name">{product.name}</td>
                      <td>{product.category?.name || "-"}</td>
                      <td className="text-right">
                        {product.expiredDate
                          ? formatDateOnly(product.expiredDate)
                          : "-"}
                      </td>
                      <td>{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <p className="report-note">
              Catatan: Peringatan expired ditampilkan maksimal 15 produk.
            </p>
          </div>

          <div className="signature-grid">
            <div>
              <p>Mengetahui,</p>
              <p className="signature-line">Pemilik Toko</p>
            </div>

            <div>
              <p>Dibuat Oleh,</p>
              <p className="signature-line">Admin / Kasir</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}