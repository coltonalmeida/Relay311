import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import TopNav from "@/components/nav/TopNav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "Relay311 — Operator Dashboard",
  description: "Review incoming 311 calls, AI-generated incident reports, and live Vapi intake.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <TopNav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
