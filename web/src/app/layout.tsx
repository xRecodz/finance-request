import type { Metadata } from "next";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const display = Libre_Baskerville({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SL INDONESIA — Permohonan Finance",
  description: "Sistem pengajuan dana, approval, pencairan, dan LPJ SL INDONESIA",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${display.variable} ${body.variable} antialiased batik-bg`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
