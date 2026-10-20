import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const TOKEN_NAME = "skincare_pos_token";

function secretKey() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "default_secret_ganti_di_env"
  );
}

export type AuthUser = {
  id: number;
  name: string;
  username: string;
  role: "ADMIN" | "KASIR";
};

export async function createToken(user: AuthUser) {
  return await new SignJWT(user)
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();

  cookieStore.set(TOKEN_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;

    if (!token) {
      return null;
    }

    const verified = await jwtVerify(token, secretKey());

    return verified.payload as AuthUser;
  } catch {
    return null;
  }
}