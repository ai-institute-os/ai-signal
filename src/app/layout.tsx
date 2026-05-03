import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AnalyticsScript from "@/components/AnalyticsScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InsideAI — Løbende AI-monitorering",
  description:
    "Se hvad AI siger om din virksomhed. Automatisk, løbende overvågning af din AI-synlighed.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "InsideAI — Løbende AI-monitorering",
    description:
      "Se hvad AI siger om din virksomhed. Automatisk, løbende overvågning af din AI-synlighed.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    url: "https://aisignal.dk",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InsideAI — Løbende AI-monitorering",
    description: "Se hvad AI siger om din virksomhed. Automatisk, løbende overvågning af din AI-synlighed.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="da"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
      <AnalyticsScript />
    </html>
  );
}
