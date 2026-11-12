import type { Metadata } from "next";
import { MarcoCuenta } from "@/components/propietario/Marcos";

export const metadata: Metadata = { title: "Mi cuenta · PET ID" };

export default function LayoutCuenta({ children }: { children: React.ReactNode }) {
  return <MarcoCuenta>{children}</MarcoCuenta>;
}
