import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Suez Stray Tracker",
  description: "Community network tracking and caring for the stray dogs of Suez City.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Suez Stray" },
};

export const viewport: Viewport = {
  themeColor: "#1A1209",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
