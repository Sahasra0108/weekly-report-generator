import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Weekly Report Generator",
  description: "Submit weekly reports and review team activity",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}