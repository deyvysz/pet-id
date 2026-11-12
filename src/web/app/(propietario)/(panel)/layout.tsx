import type { Metadata } from "next";
import { MarcoPanel } from "@/components/propietario/Marcos";

export const metadata: Metadata = { title: "Mis mascotas · PET ID" };

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  return <MarcoPanel>{children}</MarcoPanel>;
}
