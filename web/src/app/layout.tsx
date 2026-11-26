import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({ variable: "--font-press-start", weight: "400", subsets: ["latin"] });
const vt323 = VT323({ variable: "--font-vt323", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrustedPrice: Poison Arena",
  description: "Two AI agents, one poisoned price. The guarded agent cross-checks CoinMarketCap against Atlas on-chain feeds on BNB Chain.",
  icons: { icon: "/logo.webp" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${pressStart.variable} ${vt323.variable}`}>{children}</body>
    </html>
  );
}
