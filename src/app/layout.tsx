import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LegalFlow - Semper Admin Suite",
  description: "NJP Case Management and Document Generation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-neutral-dark min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
