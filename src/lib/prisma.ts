import "dotenv/config";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function loadEnvManually() {
  const possibleEnvPaths = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "resources", "app", ".env"),
    path.join(process.cwd(), "app", ".env"),
  ];

  for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({
        path: envPath,
        override: true,
      });

      break;
    }
  }
}

loadEnvManually();

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || "127.0.0.1",
  port: Number(process.env.DATABASE_PORT || 3306),
  user: process.env.DATABASE_USER || "root",
  password: process.env.DATABASE_PASSWORD || "",
  database: process.env.DATABASE_NAME || "skincare_pos_complete",
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}