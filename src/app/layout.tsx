import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay311 — Voice Intake",
  description: "Voice-first municipal intake with live Vapi transcription.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
