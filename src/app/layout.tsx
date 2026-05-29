import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sonic Crossborder Brazil Dashboard",
  description: "Internal Brazil order profit dashboard for Sonic cross-border operations.",
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
