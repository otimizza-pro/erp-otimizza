import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AutoResizeTextareaListener } from "@/components/ui/auto-resize-textarea-listener";
import { ToastProvider } from "@/components/ui/toast-provider";

const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Otimizza ERP | Gestão Financeira & Comercial",
    template: "%s | Otimizza ERP",
  },
  description: "Plataforma empresarial integrada de gestão financeira, contratos recorrentes e BI da Otimizza.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-512.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-512.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
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
        <AutoResizeTextareaListener />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
