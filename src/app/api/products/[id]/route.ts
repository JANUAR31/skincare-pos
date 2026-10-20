import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      category: true,
      subCategory: true,
      stockMutations: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
    },
  });

  if (!product) {
    return NextResponse.json(
      {
        message: "Produk tidak ditemukan",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json(product);
}

export async function PUT(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
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

  const { id } = await params;
  const productId = Number(id);
  const body = await req.json();

  const oldProduct = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!oldProduct) {
    return NextResponse.json(
      {
        message: "Produk tidak ditemukan",
      },
      {
        status: 404,
      }
    );
  }

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

  const sameCode = await prisma.product.findFirst({
    where: {
      code,
      NOT: {
        id: productId,
      },
    },
  });

  if (sameCode) {
    return NextResponse.json(
      {
        message: "Kode produk sudah digunakan produk lain",
      },
      {
        status: 400,
      }
    );
  }

  const updated = await prisma.product.update({
    where: {
      id: productId,
    },
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

  if (stock !== oldProduct.stock) {
    const difference = stock - oldProduct.stock;

    await prisma.stockMutation.create({
      data: {
        productId,
        type: difference > 0 ? "IN" : "OUT",
        quantity: Math.abs(difference),
        beforeStock: oldProduct.stock,
        afterStock: stock,
        reference: "EDIT-PRODUK",
        reason: "Perubahan stok dari edit produk",
        note: "Stok berubah dari halaman edit produk",
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
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

  const { id } = await params;
  const productId = Number(id);

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    return NextResponse.json(
      {
        message: "Produk tidak ditemukan",
      },
      {
        status: 404,
      }
    );
  }

  await prisma.product.update({
    where: {
      id: productId,
    },
    data: {
      isActive: false,
    },
  });

  return NextResponse.json({
    message: "Produk berhasil dihapus",
  });
}