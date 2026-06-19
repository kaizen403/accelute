import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Accelute QA Agent",
  description: "GitHub PR QA Agent dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} ambient-bg font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
