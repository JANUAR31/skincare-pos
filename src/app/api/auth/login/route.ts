import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const bcrypt = (await import("bcryptjs")).default;
    const { prisma } = await import("@/lib/prisma");
    const { createToken, setAuthCookie } = await import("@/lib/auth");

    const body = await req.json();

    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        {
          message: "Username dan password wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          message: "Username atau password salah.",
        },
        {
          status: 401,
        }
      );
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return NextResponse.json(
        {
          message: "Username atau password salah.",
        },
        {
          status: 401,
        }
      );
    }

    const token = await createToken({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN_ERROR:", error);

    return NextResponse.json(
      {
        message: "Terjadi kesalahan pada proses login.",
        error: error instanceof Error ? error.message : "Unknown server error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      {
        status: 500,
      }
    );
  }
}