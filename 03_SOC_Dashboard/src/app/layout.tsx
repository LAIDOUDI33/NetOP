import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "National SOC Algeria | Security Operations Center Dashboard",
  description: "Algeria National Security Operations Center - 24/7 Cyber Defense Operations",
  keywords: ["SOC", "Cybersecurity", "Algeria", "National Security", "SIEM", "SOAR"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0a0e1a" />
      </head>
      <body className="antialiased bg-[#0a0e1a] text-gray-100 min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
