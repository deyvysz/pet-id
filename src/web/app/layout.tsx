import type { Metadata } from "next";
import { Poppins, Nunito_Sans } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["600", "700"] });
const nunito = Nunito_Sans({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PET ID",
  description: "Identidad digital para mascotas en Perú",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${poppins.variable} ${nunito.variable}`}>{children}</body>
    </html>
  );
}
