import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId");
  const subCategoryId = searchParams.get("subCategoryId");

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(q
        ? {
            OR: [
              {
                name: {
                  contains: q,
                },
              },
              {
                code: {
                  contains: q,
                },
              },
              {
                brand: {
                  contains: q,
                },
              },
              {
                category: {
                  name: {
                    contains: q,
                  },
                },
              },
              {
                subCategory: {
                  name: {
                    contains: q,
                  },
                },
              },
            ],
          }
        : {}),
      ...(categoryId
        ? {
            categoryId: Number(categoryId),
          }
        : {}),
      ...(subCategoryId
        ? {
            subCategoryId: Number(subCategoryId),
          }
        : {}),
    },
    include: {
      category: true,
      subCategory: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
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

  const code = String(body.code || "").trim();
  const name = String(body.name || "").trim();
  const brand = String(body.brand || "").trim();
  const imageUrl = String(body.imageUrl || "").trim();

  const categoryId = Number(body.categoryId || 0);

  const subCategoryId =
    body.subCategoryId === "" ||
    body.subCategoryId === undefined ||
    body.subCategoryId === null
      ? null
      : Number(body.subCategoryId);

  const purchasePrice = Number(body.purchasePrice || 0);
  const sellingPrice = Number(body.sellingPrice || 0);
  const stock = Number(body.stock || 0);
  const minStock = Number(body.minStock || 0);
  const batchNumber = String(body.batchNumber || "").trim();

  const expiredDate = body.expiredDate
    ? new Date(`${body.expiredDate}T00:00:00`)
    : null;

  if (!code) {
    return NextResponse.json(
      {
        message: "Kode produk wajib diisi",
      },
      {
        status: 400,
      }
    );
  }

  if (!name) {
    return NextResponse.json(
      {
        message: "Nama produk wajib diisi",
      },
      {
        status: 400,
      }
    );
  }

  if (!categoryId) {
    return NextResponse.json(
      {
        message: "Kategori utama wajib dipilih",
      },
      {
        status: 400,
      }
    );
  }

  const exists = await prisma.product.findUnique({
    where: {
      code,
    },
  });

  if (exists) {
    return NextResponse.json(
      {
        message: "Kode produk sudah digunakan",
      },
      {
        status: 400,
      }
    );
  }

  const product = await prisma.product.create({
    data: {
      code,
      name,
      brand: brand || null,
      imageUrl: imageUrl || null,
      categoryId,
      subCategoryId,
      purchasePrice,
      sellingPrice,
      stock,
      minStock,
      batchNumber: batchNumber || null,
      expiredDate,
    },
    include: {
      category: true,
      subCategory: true,
    },
  });

  if (stock > 0) {
    await prisma.stockMutation.create({
      data: {
        productId: product.id,
        type: "IN",
        quantity: stock,
        beforeStock: 0,
        afterStock: stock,
        reference: "STOK-AWAL",
        reason: "Stok awal produk",
        note: "Stok awal saat produk dibuat",
      },
    });
  }

  return NextResponse.json(product);
}