import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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

  const selectedPeriod = `${formatDateParam(start)} sampai ${formatDateParam(end)}`;
  const filePeriod = `${formatDateParam(start)}_sampai_${formatDateParam(end)}`;

  return {
    selectedPeriod,
    filePeriod,
    start,
    end,
  };
}

function twelveMonthsLater() {
  const d = new Date();
  d.setMonth(d.getMonth() + 12);
  d.setHours(23, 59, 59, 999);

  return d;
}

function styleHeader(row: ExcelJS.Row) {
  row.font = {
    bold: true,
  };

  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FFE2E8F0",
      },
    };

    cell.border = {
      top: {
        style: "thin",
      },
      left: {
        style: "thin",
      },
      bottom: {
        style: "thin",
      },
      right: {
        style: "thin",
      },
    };
  });
}

function styleTable(sheet: ExcelJS.Worksheet) {
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: {
          style: "thin",
        },
        left: {
          style: "thin",
        },
        bottom: {
          style: "thin",
        },
        right: {
          style: "thin",
        },
      };
    });
  });

  sheet.columns.forEach((column) => {
    column.width = 22;
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const { selectedPeriod, filePeriod, start, end } = getDateRange(
    searchParams.get("startDate"),
    searchParams.get("endDate")
  );

  const today = new Date();
  const expiredLimit = twelveMonthsLater();

  const [sales, saleItems, products, expired, willExpired, setting] =
    await Promise.all([
      prisma.sale.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          user: true,
          items: true,
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
        orderBy: {
          createdAt: "asc",
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

      prisma.storeSetting.findUnique({
        where: {
          id: 1,
        },
      }),
    ]);

  const totalOmset = sales.reduce((sum, sale) => {
    return sum + sale.grandTotal;
  }, 0);

  const totalDiskonItem = sales.reduce((sum, sale) => {
    return sum + sale.itemDiscountTotal;
  }, 0);

  const totalDiskonTransaksi = sales.reduce((sum, sale) => {
    return sum + sale.transactionDiscount;
  }, 0);

  const totalLaba = saleItems.reduce((sum, item) => {
    return sum + item.profit;
  }, 0);

  const byProduct = new Map<
    number,
    {
      code: string;
      name: string;
      category: string;
      subCategory: string;
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

  const bySubCategory = new Map<
    string,
    {
      category: string;
      subCategory: string;
      qty: number;
      omset: number;
      laba: number;
    }
  >();

  for (const item of saleItems) {
    const categoryName = item.product?.category?.name || "-";
    const subCategoryName = item.product?.subCategory?.name || "-";

    const productData = byProduct.get(item.productId) || {
      code: item.productCode,
      name: item.productName,
      category: categoryName,
      subCategory: subCategoryName,
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

    const subKey = `${categoryName} > ${subCategoryName}`;

    const subCategoryData = bySubCategory.get(subKey) || {
      category: categoryName,
      subCategory: subCategoryName,
      qty: 0,
      omset: 0,
      laba: 0,
    };

    subCategoryData.qty += item.quantity;
    subCategoryData.omset += item.subtotal;
    subCategoryData.laba += item.profit;

    bySubCategory.set(subKey, subCategoryData);
  }

  const topProducts = [...byProduct.values()].sort((a, b) => {
    return b.qty - a.qty;
  });

  const slowProducts = products.filter((product) => {
    return !byProduct.has(product.id);
  });

  const lowStock = products.filter((product) => {
    return product.stock <= product.minStock;
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = setting?.storeName || "Leona Store";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Ringkasan");

  summary.addRow(["Laporan Periode"]);
  summary.addRow(["Toko", setting?.storeName || "Skincare Store"]);
  summary.addRow(["Periode", selectedPeriod]);
  summary.addRow(["Tanggal Export", new Date().toLocaleDateString("id-ID")]);
  summary.addRow([]);
  summary.addRow(["Keterangan", "Nilai"]);
  summary.addRow(["Jumlah Transaksi", sales.length]);
  summary.addRow(["Total Omset", totalOmset]);
  summary.addRow(["Total Diskon Item", totalDiskonItem]);
  summary.addRow(["Total Diskon Transaksi", totalDiskonTransaksi]);
  summary.addRow(["Total Laba", totalLaba]);
  summary.addRow(["Jumlah Produk Aktif", products.length]);
  summary.addRow(["Produk Stok Menipis", lowStock.length]);
  summary.addRow(["Produk Expired", expired.length]);
  summary.addRow(["Produk Akan Expired 12 Bulan", willExpired.length]);

  styleHeader(summary.getRow(6));
  summary.getColumn(2).numFmt = "#,##0";
  styleTable(summary);

  const transaksiSheet = workbook.addWorksheet("Transaksi");

  transaksiSheet.addRow([
    "No",
    "Tanggal",
    "Invoice",
    "Kasir",
    "Pelanggan",
    "Subtotal",
    "Diskon Item",
    "Diskon Transaksi",
    "Grand Total",
    "Bayar",
    "Kembali",
    "Metode",
  ]);

  styleHeader(transaksiSheet.getRow(1));

  sales.forEach((sale, index) => {
    transaksiSheet.addRow([
      index + 1,
      sale.createdAt,
      sale.invoiceNumber,
      sale.user?.name || "-",
      sale.customerName || "-",
      sale.subtotalBeforeDiscount,
      sale.itemDiscountTotal,
      sale.transactionDiscount,
      sale.grandTotal,
      sale.paid,
      sale.change,
      sale.paymentMethod,
    ]);
  });

  transaksiSheet.getColumn(2).numFmt = "dd/mm/yyyy hh:mm";

  [6, 7, 8, 9, 10, 11].forEach((col) => {
    transaksiSheet.getColumn(col).numFmt = "#,##0";
  });

  styleTable(transaksiSheet);

  const itemSheet = workbook.addWorksheet("Detail Item");

  itemSheet.addRow([
    "No",
    "Tanggal",
    "Kode Produk",
    "Nama Produk",
    "Kategori",
    "Subkategori",
    "Qty",
    "Harga Beli",
    "Harga Jual",
    "Diskon Item",
    "Total Diskon",
    "Subtotal",
    "Laba",
  ]);

  styleHeader(itemSheet.getRow(1));

  saleItems.forEach((item, index) => {
    itemSheet.addRow([
      index + 1,
      item.createdAt,
      item.productCode,
      item.productName,
      item.product?.category?.name || "-",
      item.product?.subCategory?.name || "-",
      item.quantity,
      item.purchasePrice,
      item.price,
      item.itemDiscount,
      item.totalDiscount,
      item.subtotal,
      item.profit,
    ]);
  });

  itemSheet.getColumn(2).numFmt = "dd/mm/yyyy hh:mm";

  [8, 9, 10, 11, 12, 13].forEach((col) => {
    itemSheet.getColumn(col).numFmt = "#,##0";
  });

  styleTable(itemSheet);

  const produkSheet = workbook.addWorksheet("Produk Terlaris");

  produkSheet.addRow([
    "No",
    "Kode",
    "Produk",
    "Kategori",
    "Subkategori",
    "Qty Terjual",
    "Omset",
    "Laba",
  ]);

  styleHeader(produkSheet.getRow(1));

  topProducts.forEach((product, index) => {
    produkSheet.addRow([
      index + 1,
      product.code,
      product.name,
      product.category,
      product.subCategory,
      product.qty,
      product.omset,
      product.laba,
    ]);
  });

  [7, 8].forEach((col) => {
    produkSheet.getColumn(col).numFmt = "#,##0";
  });

  styleTable(produkSheet);

  const kategoriSheet = workbook.addWorksheet("Omset Kategori");

  kategoriSheet.addRow(["No", "Kategori", "Qty Terjual", "Omset", "Laba"]);

  styleHeader(kategoriSheet.getRow(1));

  [...byCategory.entries()].forEach(([category, data], index) => {
    kategoriSheet.addRow([
      index + 1,
      category,
      data.qty,
      data.omset,
      data.laba,
    ]);
  });

  [4, 5].forEach((col) => {
    kategoriSheet.getColumn(col).numFmt = "#,##0";
  });

  styleTable(kategoriSheet);

  const subKategoriSheet = workbook.addWorksheet("Omset Subkategori");

  subKategoriSheet.addRow([
    "No",
    "Kategori",
    "Subkategori",
    "Qty Terjual",
    "Omset",
    "Laba",
  ]);

  styleHeader(subKategoriSheet.getRow(1));

  [...bySubCategory.values()].forEach((data, index) => {
    subKategoriSheet.addRow([
      index + 1,
      data.category,
      data.subCategory,
      data.qty,
      data.omset,
      data.laba,
    ]);
  });

  [5, 6].forEach((col) => {
    subKategoriSheet.getColumn(col).numFmt = "#,##0";
  });

  styleTable(subKategoriSheet);

  const stokSheet = workbook.addWorksheet("Stok Saat Ini");

  stokSheet.addRow([
    "No",
    "Kode",
    "Produk",
    "Kategori",
    "Subkategori",
    "Brand",
    "Batch",
    "Expired",
    "Stok",
    "Min Stok",
    "Status",
  ]);

  styleHeader(stokSheet.getRow(1));

  products.forEach((product, index) => {
    stokSheet.addRow([
      index + 1,
      product.code,
      product.name,
      product.category?.name || "-",
      product.subCategory?.name || "-",
      product.brand || "-",
      product.batchNumber || "-",
      product.expiredDate || "-",
      product.stock,
      product.minStock,
      product.stock <= product.minStock ? "Menipis" : "Aman",
    ]);
  });

  stokSheet.getColumn(8).numFmt = "dd/mm/yyyy";

  styleTable(stokSheet);

  const stokMenipisSheet = workbook.addWorksheet("Stok Menipis");

  stokMenipisSheet.addRow([
    "No",
    "Kode",
    "Produk",
    "Kategori",
    "Subkategori",
    "Stok",
    "Min Stok",
    "Catatan",
  ]);

  styleHeader(stokMenipisSheet.getRow(1));

  lowStock.forEach((product, index) => {
    stokMenipisSheet.addRow([
      index + 1,
      product.code,
      product.name,
      product.category?.name || "-",
      product.subCategory?.name || "-",
      product.stock,
      product.minStock,
      "",
    ]);
  });

  styleTable(stokMenipisSheet);

  const expiredSheet = workbook.addWorksheet("Expired 12 Bulan");

  expiredSheet.addRow([
    "No",
    "Kode",
    "Produk",
    "Kategori",
    "Subkategori",
    "Batch",
    "Expired",
    "Status",
  ]);

  styleHeader(expiredSheet.getRow(1));

  [...expired, ...willExpired].forEach((product, index) => {
    const isExpired = product.expiredDate && product.expiredDate < today;

    expiredSheet.addRow([
      index + 1,
      product.code,
      product.name,
      product.category?.name || "-",
      product.subCategory?.name || "-",
      product.batchNumber || "-",
      product.expiredDate || "-",
      isExpired ? "Expired" : "Akan Expired 12 Bulan",
    ]);
  });

  expiredSheet.getColumn(7).numFmt = "dd/mm/yyyy";

  styleTable(expiredSheet);

  const kurangLakuSheet = workbook.addWorksheet("Produk Kurang Laku");

  kurangLakuSheet.addRow([
    "No",
    "Kode",
    "Produk",
    "Kategori",
    "Subkategori",
    "Stok",
    "Catatan",
  ]);

  styleHeader(kurangLakuSheet.getRow(1));

  slowProducts.forEach((product, index) => {
    kurangLakuSheet.addRow([
      index + 1,
      product.code,
      product.name,
      product.category?.name || "-",
      product.subCategory?.name || "-",
      product.stock,
      "",
    ]);
  });

  styleTable(kurangLakuSheet);

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-periode-${filePeriod}.xlsx"`,
    },
  });
}