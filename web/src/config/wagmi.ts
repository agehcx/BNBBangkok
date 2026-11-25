import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, keccak256, toHex } from "viem";
import { bscTestnet } from "viem/chains";

export const config = getDefaultConfig({
  appName: "Aura // BNB RWA Engine",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo",
  chains: [bscTestnet],
  transports: { [bscTestnet.id]: http("https://data-seed-prebsc-1-s1.binance.org:8545/") },
  ssr: true,
});

export const VAULT = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}` | undefined;
export const ATLAS = process.env.NEXT_PUBLIC_ATLAS_ORACLE_ADDRESS as `0x${string}` | undefined;
export const FEED_ID = keccak256(toHex("XAU/USD"));
export const ORACLE_DECIMALS = 8;
export const EXPLORER = "https://testnet.bscscan.com";

export const vaultAbi = [
  { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "status", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "shares", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "oraclePrice", stateMutability: "view",
    inputs: [{ name: "feedId", type: "bytes32" }],
    outputs: [{ name: "price", type: "uint256" }, { name: "age", type: "uint256" }],
  },
  {
    type: "function", name: "executeRiskAction", stateMutability: "nonpayable",
    inputs: [{ name: "feedId", type: "bytes32" }, { name: "actionType", type: "uint8" }, { name: "expectedPrice", type: "uint256" }],
    outputs: [],
  },
] as const;
