import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WHO基準LBW児授乳管理ダッシュボード",
  description:
    "WHO国際基準に基づく低出生体重児の授乳量・体重管理ガイド",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
