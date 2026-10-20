import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
const adapter = new PrismaMariaDb({ host: process.env.DATABASE_HOST || "localhost", port: Number(process.env.DATABASE_PORT || 3306), user: process.env.DATABASE_USER || "root", password: process.env.DATABASE_PASSWORD || "", database: process.env.DATABASE_NAME || "skincare_pos_complete" });
const prisma = new PrismaClient({ adapter });
async function main(){ const adminPassword=await bcrypt.hash("admin123",10); const kasirPassword=await bcrypt.hash("kasir123",10); await prisma.user.upsert({where:{username:"admin"},update:{password:adminPassword},create:{name:"Administrator",username:"admin",password:adminPassword,role:"ADMIN"}}); await prisma.user.upsert({where:{username:"kasir"},update:{password:kasirPassword},create:{name:"Kasir",username:"kasir",password:kasirPassword,role:"KASIR"}}); for(const name of ["Facial Wash","Toner","Serum","Moisturizer","Sunscreen","Masker","Cleanser","Essence","Eye Cream","Lip Care","Lainnya"]){ await prisma.category.upsert({where:{name},update:{},create:{name}}); } await prisma.storeSetting.upsert({where:{id:1},update:{},create:{id:1,storeName:"Skincare Store",address:"Alamat toko belum diatur",phone:"-",receiptNote:"Terima kasih atas kunjungan Anda."}}); console.log("Seed selesai."); }
main().finally(async()=>await prisma.$disconnect());
