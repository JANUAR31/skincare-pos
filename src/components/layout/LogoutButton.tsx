"use client";
import { useRouter } from "next/navigation";
export default function LogoutButton(){ const router=useRouter(); async function logout(){ await fetch("/api/auth/logout",{method:"POST"}); router.push("/login"); router.refresh(); } return <button onClick={logout} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Logout</button>; }
