import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BirdID — Hear a bird. Know it.",
  description:
    "Upload a bird sound or video and instantly identify the species with habitat, diet, behavior, range, and fun facts.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BirdID",
  },
  openGraph: {
    title: "BirdID — Hear a bird. Know it.",
    description: "Identify any bird from audio or video in seconds.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
