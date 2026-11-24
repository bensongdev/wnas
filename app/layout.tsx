import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebStarter",
  description: "WNAS로 만든 웹앱",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
