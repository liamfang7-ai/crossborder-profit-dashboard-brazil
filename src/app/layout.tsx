import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sonic Brazil Operations Dashboard",
  description:
    "Internal operations dashboard for Sonic cross-border order and profit analysis.",
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
