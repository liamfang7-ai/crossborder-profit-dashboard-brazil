import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brazil ERP",
  description: "Mercado Livre Brasil SKU Profit Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 font-sans">{children}</body>
    </html>
  );
}
