import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
export async function GET(){ let s=await prisma.storeSetting.findUnique({where:{id:1}}); if(!s) s=await prisma.storeSetting.create({data:{id:1,storeName:"Skincare Store"}}); return NextResponse.json(s); }
export async function PUT(req:Request){ const user=await getCurrentUser(); if(!user||user.role!=="ADMIN") return NextResponse.json({message:"Unauthorized"},{status:401}); const b=await req.json(); const s=await prisma.storeSetting.upsert({where:{id:1},update:{storeName:String(b.storeName||"Skincare Store"),address:b.address?String(b.address):null,phone:b.phone?String(b.phone):null,receiptNote:b.receiptNote?String(b.receiptNote):null},create:{id:1,storeName:String(b.storeName||"Skincare Store"),address:b.address?String(b.address):null,phone:b.phone?String(b.phone):null,receiptNote:b.receiptNote?String(b.receiptNote):null}}); return NextResponse.json(s); }
