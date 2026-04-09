import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/react";
import { SessionProvider } from "next-auth/react";
import { Navbar } from "@/components/navbar";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vinylith — Library of Curiosities",
  description:
    "A modern library for books, toys, notebooks, and vintage vinyl records.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <SessionProvider>
          <TRPCReactProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-sm text-neutral-500">
              Vinylith · a curated library for the curious
            </footer>
            <Toaster richColors position="top-right" />
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
