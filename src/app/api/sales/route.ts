import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/invoice";

function clampPercent(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(value, 100));
}

function calculateDiscountAmount(price: number, percent: number) {
  return Math.round(price * (clampPercent(percent) / 100));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const sales = await prisma.sale.findMany({
    where:
      from || to
        ? {
            createdAt: {
              gte: from ? new Date(`${from}T00:00:00`) : undefined,
              lte: to ? new Date(`${to}T23:59:59`) : undefined,
            },
          }
        : undefined,
    include: {
      user: true,
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(sales);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const body = await req.json();

  const items = body.items || [];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      {
        message: "Keranjang masih kosong",
      },
      {
        status: 400,
      }
    );
  }

  const paid = Number(body.paid || 0);
  const transactionDiscountPercent = clampPercent(
    Number(body.transactionDiscountPercent || 0)
  );
  const paymentMethod = body.paymentMethod || "CASH";
  const customerName = body.customerName ? String(body.customerName) : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      let subtotalBeforeDiscount = 0;
      let itemDiscountTotal = 0;
      let totalAfterItemDiscount = 0;

      const ids = items.map((item: any) => {
        return Number(item.productId);
      });

      const products = await tx.product.findMany({
        where: {
          id: {
            in: ids,
          },
          isActive: true,
        },
      });

      const map = new Map(products.map((product) => [product.id, product]));

      for (const item of items) {
        const product = map.get(Number(item.productId));
        const quantity = Number(item.quantity || 1);
        const itemDiscountPercent = clampPercent(
          Number(item.itemDiscountPercent || 0)
        );

        if (!product) {
          throw new Error("Produk tidak ditemukan");
        }

        if (quantity <= 0) {
          throw new Error("Jumlah produk tidak valid");
        }

        if (product.stock < quantity) {
          throw new Error(`Stok ${product.name} tidak cukup`);
        }

        const itemDiscountAmount = calculateDiscountAmount(
          product.sellingPrice,
          itemDiscountPercent
        );

        subtotalBeforeDiscount += product.sellingPrice * quantity;
        itemDiscountTotal += itemDiscountAmount * quantity;
        totalAfterItemDiscount += Math.max(
          (product.sellingPrice - itemDiscountAmount) * quantity,
          0
        );
      }

      const transactionDiscount = Math.round(
        totalAfterItemDiscount * (transactionDiscountPercent / 100)
      );

      const grandTotal = Math.max(
        totalAfterItemDiscount - transactionDiscount,
        0
      );

      if (paid < grandTotal) {
        throw new Error("Uang bayar kurang");
      }

      const sale = await tx.sale.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          userId: user.id,
          customerName,
          subtotalBeforeDiscount,
          itemDiscountTotal,
          transactionDiscount,
          grandTotal,
          paid,
          change: paid - grandTotal,
          paymentMethod,
          note: body.note ? String(body.note) : null,
        },
      });

      for (const item of items) {
        const productId = Number(item.productId);
        const quantity = Number(item.quantity || 1);
        const itemDiscountPercent = clampPercent(
          Number(item.itemDiscountPercent || 0)
        );

        const product = map.get(productId)!;

        const beforeStock = product.stock;
        const afterStock = beforeStock - quantity;

        const itemDiscountAmount = calculateDiscountAmount(
          product.sellingPrice,
          itemDiscountPercent
        );

        const totalDiscount = itemDiscountAmount * quantity;

        const subtotal = Math.max(
          (product.sellingPrice - itemDiscountAmount) * quantity,
          0
        );

        const profit =
          (product.sellingPrice - itemDiscountAmount - product.purchasePrice) *
          quantity;

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId,
            productCode: product.code,
            productName: product.name,
            quantity,
            purchasePrice: product.purchasePrice,
            price: product.sellingPrice,
            itemDiscount: itemDiscountAmount,
            totalDiscount,
            subtotal,
            profit,
          },
        });

        await tx.product.update({
          where: {
            id: productId,
          },
          data: {
            stock: afterStock,
          },
        });

        await tx.stockMutation.create({
          data: {
            productId,
            type: "SALE",
            quantity: -quantity,
            beforeStock,
            afterStock,
            reference: sale.invoiceNumber,
            reason: "PENJUALAN",
            note: "Penjualan kasir",
          },
        });
      }

      return sale;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error.message || "Transaksi gagal",
      },
      {
        status: 400,
      }
    );
  }
}