import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import PrintReceiptButton from "@/components/PrintReceiptButton";

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  const rounded = Math.round(value * 100) / 100;

  if (Number.isInteger(rounded)) {
    return `${rounded}%`;
  }

  return `${rounded.toFixed(2)}%`;
}

export default async function NotaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [sale, setting] = await Promise.all([
    prisma.sale.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        items: true,
        user: true,
      },
    }),

    prisma.storeSetting.findUnique({
      where: {
        id: 1,
      },
    }),
  ]);

  if (!sale) {
    notFound();
  }

  const totalAfterItemDiscount = Math.max(
    sale.subtotalBeforeDiscount - sale.itemDiscountTotal,
    0
  );

  const transactionDiscountPercent =
    totalAfterItemDiscount > 0
      ? (sale.transactionDiscount / totalAfterItemDiscount) * 100
      : 0;

  const hasItemDiscount = sale.itemDiscountTotal > 0;
  const hasTransactionDiscount = sale.transactionDiscount > 0;

  return (
    <>
      <style>
        {`
          .receipt-page {
            min-height: 100vh;
            background: #f1f5f9;
            padding: 24px;
            color: #000000;
            font-family: Arial, Helvetica, sans-serif;
          }

          .receipt-toolbar {
            margin-bottom: 24px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .receipt-back-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            background: #ffffff;
            padding: 12px 20px;
            font-weight: 600;
            color: #111827;
            text-decoration: none;
          }

          .receipt-back-link:hover {
            background: #f8fafc;
          }

          .receipt-print {
            width: 58mm;
            max-width: 58mm;
            margin: 0 auto;
            overflow: visible;
            background: #ffffff;
            color: #000000;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
          }

          .receipt-inner {
            box-sizing: border-box;
            width: 54.5mm;
            margin-left: -0.8mm;
            margin-right: auto;
            padding: 2mm 1.6mm 2mm 0.6mm;
            background: #ffffff;
            color: #000000;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.25;
          }

          .receipt-center {
            text-align: center;
          }

          .receipt-store-name {
            margin: 0 0 2px 0;
            font-size: 14px;
            line-height: 1.15;
            font-weight: 700;
            word-break: break-word;
          }

          .receipt-small {
            margin: 0;
            font-size: 9.2px;
            line-height: 1.2;
            word-break: break-word;
          }

          .receipt-line {
            margin: 5px 0;
            border-top: 1px dashed #000000;
          }

          .receipt-info,
          .receipt-total,
          .receipt-items {
            width: 100%;
          }

          .receipt-row {
            display: flex;
            justify-content: space-between;
            gap: 4px;
            width: 100%;
          }

          .receipt-row span:first-child {
            flex: 1;
            min-width: 0;
            text-align: left;
            word-break: break-word;
          }

          .receipt-row span:last-child {
            flex-shrink: 0;
            text-align: right;
            white-space: nowrap;
          }

          .receipt-info .receipt-row {
            align-items: flex-start;
            gap: 2mm;
          }

          .receipt-info .receipt-row span:first-child {
            width: 16mm;
            flex: 0 0 16mm;
            white-space: nowrap;
            word-break: normal;
            overflow-wrap: normal;
          }

          .receipt-info .receipt-row span:last-child {
            flex: 1;
            max-width: none;
            white-space: normal;
            overflow: visible;
            word-break: break-word;
            overflow-wrap: anywhere;
            line-height: 1.2;
            text-align: right;
          }

          .receipt-item {
            margin-bottom: 5px;
          }

          .receipt-product-name {
            margin: 0 0 2px 0;
            font-weight: 700;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .receipt-semibold {
            font-weight: 700;
          }

          .receipt-grand-total {
            margin-top: 5px;
            padding-top: 4px;
            border-top: 1px dashed #000000;
            font-size: 12px;
            font-weight: 700;
          }

          .receipt-footer {
            font-size: 9.2px;
            line-height: 1.25;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .receipt-footer p {
            margin: 0;
          }

          .receipt-bottom-space {
            height: 8mm;
          }

          @media screen {
            .receipt-page {
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .receipt-toolbar {
              align-self: flex-start;
            }

            .receipt-print {
              transform: scale(1.2);
              transform-origin: top center;
              margin-top: 20px;
              margin-bottom: 140px;
            }

            .receipt-inner {
              margin-left: auto;
              margin-right: auto;
            }
          }

          @media print {
            @page {
              size: 58mm auto;
              margin: 0;
            }

            html,
            body {
              width: 58mm !important;
              min-width: 58mm !important;
              max-width: 58mm !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, Helvetica, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body * {
              visibility: hidden !important;
            }

            .receipt-page,
            .receipt-page * {
              visibility: visible !important;
            }

            .no-print,
            .no-print * {
              display: none !important;
              visibility: hidden !important;
            }

            .receipt-page {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 58mm !important;
              min-width: 58mm !important;
              max-width: 58mm !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, Helvetica, sans-serif !important;
            }

            .receipt-print {
              width: 58mm !important;
              min-width: 58mm !important;
              max-width: 58mm !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
              font-family: Arial, Helvetica, sans-serif !important;
              transform: none !important;
            }

            .receipt-inner {
              box-sizing: border-box !important;
              width: 54.5mm !important;
              min-width: 54.5mm !important;
              max-width: 54.5mm !important;
              height: auto !important;
              min-height: 0 !important;
              margin-left: -0.8mm !important;
              margin-right: auto !important;
              padding: 1mm 1.6mm 1.5mm 0.6mm !important;
              overflow: visible !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, Helvetica, sans-serif !important;
              font-size: 10.8px !important;
              line-height: 1.22 !important;
              transform: none !important;
              zoom: 1 !important;
            }

            .receipt-store-name {
              font-size: 13.5px !important;
              line-height: 1.15 !important;
              margin: 0 0 2px 0 !important;
              font-weight: 700 !important;
            }

            .receipt-small {
              font-size: 8.8px !important;
              line-height: 1.2 !important;
              margin: 0 !important;
            }

            .receipt-row {
              gap: 3px !important;
            }

            .receipt-row span:first-child {
              word-break: break-word !important;
              overflow-wrap: anywhere !important;
            }

            .receipt-row span:last-child {
              white-space: nowrap !important;
            }

            .receipt-info .receipt-row {
              gap: 2mm !important;
            }

            .receipt-info .receipt-row span:first-child {
              width: 16mm !important;
              flex: 0 0 16mm !important;
              white-space: nowrap !important;
              word-break: normal !important;
              overflow-wrap: normal !important;
            }

            .receipt-info .receipt-row span:last-child {
              white-space: normal !important;
              overflow: visible !important;
              word-break: break-word !important;
              overflow-wrap: anywhere !important;
              line-height: 1.18 !important;
              text-align: right !important;
            }

            .receipt-line {
              margin: 4px 0 !important;
            }

            .receipt-item {
              margin-bottom: 4px !important;
            }

            .receipt-product-name {
              margin: 0 0 2px 0 !important;
              font-size: 10.8px !important;
              font-weight: 700 !important;
              line-height: 1.2 !important;
            }

            .receipt-semibold {
              font-weight: 700 !important;
            }

            .receipt-grand-total {
              margin-top: 4px !important;
              padding-top: 3px !important;
              font-size: 12px !important;
              line-height: 1.22 !important;
              font-weight: 700 !important;
            }

            .receipt-footer {
              font-size: 8.8px !important;
              line-height: 1.2 !important;
            }

            .receipt-bottom-space {
              height: 6mm !important;
            }
          }
        `}
      </style>

      <main className="receipt-page">
        <div className="receipt-toolbar no-print">
          <PrintReceiptButton />

          <Link href="/kasir" className="receipt-back-link">
            Kembali Kasir
          </Link>

          <Link href="/admin/transaksi" className="receipt-back-link">
            Riwayat
          </Link>
        </div>

        <section className="receipt-print">
          <div className="receipt-inner">
            <div className="receipt-center">
              <h1 className="receipt-store-name">
                {setting?.storeName || "Leona Store"}
              </h1>

              {setting?.address && (
                <p className="receipt-small">{setting.address}</p>
              )}

              {setting?.phone && (
                <p className="receipt-small">Telp: {setting.phone}</p>
              )}
            </div>

            <div className="receipt-line" />

            <div className="receipt-info">
              <div className="receipt-row">
                <span>No</span>
                <span>{sale.invoiceNumber}</span>
              </div>

              <div className="receipt-row">
                <span>Tgl</span>
                <span>{formatDate(sale.createdAt)}</span>
              </div>

              <div className="receipt-row">
                <span>Kasir</span>
                <span>{sale.user?.name || "-"}</span>
              </div>

              {sale.customerName && (
                <div className="receipt-row">
                  <span>Pelanggan</span>
                  <span>{sale.customerName}</span>
                </div>
              )}
            </div>

            <div className="receipt-line" />

            <div className="receipt-items">
              {sale.items.map((item) => {
                const normalTotal = item.price * item.quantity;

                const itemDiscountPercent =
                  item.price > 0 ? (item.itemDiscount / item.price) * 100 : 0;

                return (
                  <div key={item.id} className="receipt-item">
                    <p className="receipt-product-name">{item.productName}</p>

                    <div className="receipt-row">
                      <span>
                        {item.quantity} x {formatCurrency(item.price)}
                      </span>
                      <span>{formatCurrency(normalTotal)}</span>
                    </div>

                    {item.itemDiscount > 0 && (
                      <div className="receipt-row">
                        <span>
                          Diskon item {formatPercent(itemDiscountPercent)}
                        </span>
                        <span>-{formatCurrency(item.totalDiscount)}</span>
                      </div>
                    )}

                    <div className="receipt-row receipt-semibold">
                      <span>Subtotal</span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="receipt-line" />

            <div className="receipt-total">
              <div className="receipt-row">
                <span>Subtotal</span>
                <span>{formatCurrency(sale.subtotalBeforeDiscount)}</span>
              </div>

              {hasItemDiscount && (
                <div className="receipt-row">
                  <span>Diskon Item</span>
                  <span>-{formatCurrency(sale.itemDiscountTotal)}</span>
                </div>
              )}

              {hasTransactionDiscount && (
                <div className="receipt-row">
                  <span>
                    Diskon Transaksi {formatPercent(transactionDiscountPercent)}
                  </span>
                  <span>-{formatCurrency(sale.transactionDiscount)}</span>
                </div>
              )}

              <div className="receipt-row receipt-grand-total">
                <span>Grand Total</span>
                <span>{formatCurrency(sale.grandTotal)}</span>
              </div>

              <div className="receipt-row">
                <span>Bayar</span>
                <span>{formatCurrency(sale.paid)}</span>
              </div>

              <div className="receipt-row">
                <span>Kembali</span>
                <span>{formatCurrency(sale.change)}</span>
              </div>

              <div className="receipt-row">
                <span>Metode</span>
                <span>{sale.paymentMethod}</span>
              </div>
            </div>

            <div className="receipt-line" />

            <div className="receipt-center receipt-footer">
              <p>
                {setting?.receiptNote ||
                  "Terima kasih sudah berbelanja di Leona Store."}
              </p>
            </div>

            <div className="receipt-bottom-space" />
          </div>
        </section>
      </main>
    </>
  );
}