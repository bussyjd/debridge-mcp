/**
 * Zod schemas and shared types for deBridge MCP tools.
 */

import { z } from "zod";
import { EVM_ADDRESS_REGEX, SOLANA_ADDRESS_REGEX } from "../lib/constants.js";

export const chainIdSchema = z.coerce.string().refine(
  (val) => {
    const num = Number.parseInt(val, 10);
    if (!Number.isSafeInteger(num)) return false;
    if (num > 0 && num < 100000) return true;
    if (num >= 100000000) return true;
    return num === 7565164;
  },
  {
    message: "Chain ID must be 1-99999, 7565164 for Solana, or 100000000+",
  }
);

export const evmAddressSchema = z
  .string()
  .regex(EVM_ADDRESS_REGEX, "Address must be a valid 0x-prefixed EVM address");

export const tokenAddressSchema = z.string().refine(
  (val) => EVM_ADDRESS_REGEX.test(val) || SOLANA_ADDRESS_REGEX.test(val),
  "Token address must be a valid EVM address or Solana address"
);

export const positiveIntegerStringSchema = z
  .union([z.string(), z.number(), z.bigint()])
  .transform((value) => value.toString())
  .refine((value) => /^\d+$/.test(value) && BigInt(value) > 0n, {
    message: "Value must be a positive integer string in base units",
  });

export const nonNegativeIntegerStringSchema = z
  .union([z.string(), z.number(), z.bigint()])
  .optional()
  .transform((value) => (value === undefined ? "0" : value.toString()))
  .refine((value) => /^\d+$/.test(value) && BigInt(value) >= 0n, {
    message: "Value must be a non-negative integer string in base units",
  });

export const booleanSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return value;
}, z.boolean());

export const searchTokenSchema = z.object({
  chainId: chainIdSchema.describe("Chain ID to get token information for"),
  search: z.string().optional().describe("Search term to filter tokens by symbol"),
});

export const createTxWithReferralSchema = z.object({
  srcChainId: chainIdSchema.describe("Source chain ID"),
  srcChainTokenIn: tokenAddressSchema.describe("Source token address"),
  srcChainTokenInAmount: positiveIntegerStringSchema.describe(
    "Input amount in source token base units"
  ),
  dstChainId: chainIdSchema.describe("Destination chain ID"),
  dstChainTokenOut: tokenAddressSchema.describe("Destination token address"),
  dstChainTokenOutAmount: z
    .union([z.literal("auto"), positiveIntegerStringSchema])
    .default("auto")
    .describe("Destination output amount in base units, or auto"),
  dstChainTokenOutRecipient: z
    .string()
    .refine(
      (val) => EVM_ADDRESS_REGEX.test(val) || SOLANA_ADDRESS_REGEX.test(val),
      "Recipient must be a valid EVM or Solana address"
    ),
  senderAddress: evmAddressSchema.describe("Source-chain sender address"),
  srcChainOrderAuthorityAddress: evmAddressSchema.optional(),
  srcChainRefundAddress: evmAddressSchema.optional(),
  dstChainOrderAuthorityAddress: z
    .string()
    .refine(
      (val) => EVM_ADDRESS_REGEX.test(val) || SOLANA_ADDRESS_REGEX.test(val),
      "Destination authority must be a valid EVM or Solana address"
    )
    .optional(),
  referralCode: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("deBridge referral code; defaults to DEBRIDGE_REFERRAL_CODE"),
  slippage: z.coerce.number().min(0).max(100).optional(),
  prependOperatingExpenses: booleanSchema.default(true),
  additionalTakerRewardBps: z.coerce.number().int().min(0).optional(),
  deBridgeApp: z.string().optional(),
});

export const sourcePreflightSchema = z.object({
  chainId: chainIdSchema.describe("Source EVM chain ID"),
  ownerAddress: evmAddressSchema.describe("Wallet that will submit the source transaction"),
  tokenAddress: evmAddressSchema.describe("ERC-20 token address, or zero address for native"),
  tokenAmount: positiveIntegerStringSchema.describe("Required source token amount"),
  spenderAddress: evmAddressSchema.describe("Approval spender, usually tx.to"),
  txValue: nonNegativeIntegerStringSchema.describe("Native value required by the DLN tx"),
  txTo: evmAddressSchema.optional(),
  txData: z.string().regex(/^0x[a-fA-F0-9]*$/).optional(),
  rpcUrl: z.string().url().optional().describe("Source-chain eRPC/RPC endpoint"),
});

export const getOrdersByReferralCodeSchema = z.object({
  referralCode: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("deBridge referral code; defaults to DEBRIDGE_REFERRAL_CODE"),
  giveChainIds: z.array(z.number().int().positive()).default([]),
  orderStates: z
    .array(z.string())
    .default(["Fulfilled", "SentUnlock", "ClaimedUnlock"]),
  externalCallStates: z.array(z.string()).default(["NoExtCall"]),
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(100).default(20),
  blockTimestampFrom: z.number().int().positive().optional(),
});

export interface ChainInfo {
  chainId: string | number;
  originalChainId: string | number;
  chainName: string;
  chainType?: "evm" | "solana";
  nativeToken?: {
    symbol: string;
    name: string;
    decimals: number;
  };
  explorerUrl?: string;
  rpcUrl?: string;
  isTestnet?: boolean;
}

export interface SupportedChainsInfoResponse {
  chains: ChainInfo[];
}

export type SearchTokenParams = z.infer<typeof searchTokenSchema>;
export type CreateTxWithReferralParams = z.infer<typeof createTxWithReferralSchema>;
export type SourcePreflightParams = z.infer<typeof sourcePreflightSchema>;
export type GetOrdersByReferralCodeParams = z.infer<typeof getOrdersByReferralCodeSchema>;
