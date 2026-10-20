import { ReactNode } from "react";
import KasirLayout from "@/components/layout/KasirLayout";

export default function Layout({
  children,
}: {
  children: ReactNode;
}) {
  return <KasirLayout>{children}</KasirLayout>;
}