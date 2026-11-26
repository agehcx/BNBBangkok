"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "@/config/wagmi";

const base = darkTheme({ accentColor: "#F2B90D", accentColorForeground: "#1F1F23", borderRadius: "none" });
// Wrong-network button uses colors.error; keep it on-palette (green) instead of red.
const theme = { ...base, colors: { ...base.colors, error: "#2BD67B" } };

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
