import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "리그 툴",
  description: "스타크래프트 팀리그 순위 및 일정 관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
