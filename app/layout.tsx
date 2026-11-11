import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "금융상담 통합지원센터 | 운영자 관리",
  description: "금융상담 통합지원센터 접수 관리",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
