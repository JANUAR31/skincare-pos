import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: {
      parentId: null,
    },
    include: {
      children: {
        orderBy: {
          name: "asc",
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  return NextResponse.json(categories);
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

  const name = String(body.name || "").trim();

  const parentId =
    body.parentId === "" || body.parentId === undefined || body.parentId === null
      ? null
      : Number(body.parentId);

  if (!name) {
    return NextResponse.json(
      {
        message: "Nama kategori wajib diisi",
      },
      {
        status: 400,
      }
    );
  }

  const category = await prisma.category.create({
    data: {
      name,
      parentId,
    },
  });

  return NextResponse.json(category);
}