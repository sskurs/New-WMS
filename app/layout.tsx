import React from 'react';
// FIX: Changed the import of 'Metadata' to a type import 'import type { Metadata } from "next"' to resolve the TypeScript error.
import type { Metadata } from "next";
import AppLayout from '@/components/AppLayout';
import "./globals.css";

export const metadata: Metadata = {
  title: "Propix Technologies Pvt. Ltd.",
  description: "A comprehensive Warehouse Management System (WMS) from Propix Technologies Pvt. Ltd. to handle inventory and warehouse operations efficiently. This application provides tools for product cataloging, real-time stock tracking, inbound and outbound logistics, and inventory audits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <AppLayout children={children} />
      </body>
    </html>
  );
}