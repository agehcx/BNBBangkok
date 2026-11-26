import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { Pixelify_Sans, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";

const pixel = Pixelify_Sans({ subsets: ["latin"], weight: ["700"], variable: "--font-pixel" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = { title: "Aura // BNB RWA Engine" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixel.variable} ${grotesk.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
