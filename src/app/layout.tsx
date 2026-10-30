import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Otimizza ERP | Gestão Financeira & Comercial",
    template: "%s | Otimizza ERP",
  },
  description: "Plataforma empresarial integrada de gestão financeira, contratos recorrentes e BI da Otimizza.",
  icons: {
    icon: [
      { url: "/brand/favicon-512.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-512.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/brand/avatar-escuro.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
