import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "跨境电商实时利润看板",
  description: "跨境电商订单、成本、利润和利润率实时统计后台",
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
