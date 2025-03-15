/**
 * Zod schemas for DeBridge MCP tool parameters
 */

import { z } from "zod";
import { EVM_ADDRESS_REGEX, SOLANA_ADDRESS_REGEX } from "../lib/constants.js";

/**
 * Chain ID validation schema
 * Based on DLN API v1.0 specification
 */
export const chainIdSchema = z.string().refine(
  (val) => {
    // Convert to number for easier comparison
    const num = Number.parseInt(val, 10);
    // Regular chain IDs (1-99999)
    if (num > 0 && num < 100000) return true;
    // Special chain IDs (100000000+)
    if (num >= 100000000) return true;
    // Solana chain ID (7565164)
    if (num === 7565164) return true;
    return false;
  },
  {
    message: "Chain ID must be either 1-99999, 7565164 (Solana), or 100000000+",
  }
);

/**
 * Schema for search_token tool parameters
 */
export const searchTokenSchema = z.object({
  /** Chain ID to query tokens for */
  chainId: chainIdSchema.describe("Chain ID to get token information for"),

  /** Optional search term to filter tokens by name or symbol */
  search: z.string().optional().describe("Search term to filter tokens by name or symbol"),
});

/**
 * Schema for get_bridge_quote tool parameters
 */
export const getBridgeQuoteSchema = z.object({
  /** Chain ID of the source blockchain */
  srcChainId: chainIdSchema.describe("Source chain ID (e.g., '1' for Ethereum)"),

  /** Token address on the source chain to be bridged */
  srcChainTokenIn: z
    .string()
    .refine(
      (val) => EVM_ADDRESS_REGEX.test(val) || SOLANA_ADDRESS_REGEX.test(val),
      "Token address must be a valid EVM or Solana address"
    ),

  /** Amount of tokens to bridge in base units */
  srcChainTokenInAmount: z
    .union([z.literal("auto"), z.string().pipe(z.coerce.number().positive().int().transform(String))])
    .describe("Amount must be 'auto' or a positive integer in token decimals"),

  /** Chain ID of the destination blockchain */
  dstChainId: chainIdSchema
    .refine((val) => {
      // This is a simplified version that will be checked against parent in a superRefine
      return true;
    }, "Destination chain must be a valid chain ID")
    .describe("Destination chain ID (e.g., '56' for BSC, '7565164' for Solana)"),

  /** Token address on the destination chain to receive */
  dstChainTokenOut: z
    .string()
    .refine(
      (val) => EVM_ADDRESS_REGEX.test(val) || SOLANA_ADDRESS_REGEX.test(val),
      "Token address must be a valid EVM or Solana address"
    )
    .describe("Destination token address (EVM format for EVM chains, native format for Solana)"),

  /** Slippage percentage for the quote */
  slippage: z
    .string()
    .pipe(z.coerce.number().min(0).max(100).transform(String))
    .optional()
    .describe("Slippage must be a valid percentage between 0 and 100"),
}).superRefine((data, ctx) => {
  // Check that source and destination chains are different
  if (data.srcChainId === data.dstChainId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Source and destination chains must be different",
      path: ["dstChainId"],
    });
  }
});

/**
 * Schema for create_bridge_order tool parameters
 */
export const createBridgeOrderSchema = z.object({
  /** Chain ID of the source blockchain */
  srcChainId: chainIdSchema.describe(
    "Source chain ID (e.g., '1' for Ethereum, '56' for BSC) where the cross-chain swap will start"
  ),

  /** Token address on the source chain */
  srcChainTokenIn: z
    .string()
    .refine(
      (val) => EVM_ADDRESS_REGEX.test(val) || SOLANA_ADDRESS_REGEX.test(val),
      "Token address must be either a valid EVM address (0x-prefixed) or Solana address (base58)"
    )
    .describe(
      "Token address on source chain. For EVM: use 0x0000000000000000000000000000000000000000 for native token. For Solana: use proper token mint address"
    ),

  /** Amount of tokens to bridge */
  srcChainTokenInAmount: z
    .string()
    .pipe(z.coerce.number().positive().int().transform(String))
    .describe("Amount of input tokens in base units (e.g., wei for ETH, 10^6 for USDT)"),

  /** Chain ID of the destination blockchain */
  dstChainId: chainIdSchema
    .refine((val) => {
      // This is a simplified version that will be checked against parent in a superRefine
      return true;
    }, "Destination chain must be a valid chain ID")
    .describe("Destination chain ID (e.g., '7565164' for Solana)"),

  /** Token address on the destination chain */
  dstChainTokenOut: z
    .string()
    .refine(
      (val) => EVM_ADDRESS_REGEX.test(val) || SOLANA_ADDRESS_REGEX.test(val),
      "Token address must be either a valid EVM address (0x-prefixed) or Solana address (base58)"
    )
    .describe("Full token address on destination chain."),

  /** Recipient address on the destination chain */
  dstChainTokenOutRecipient: z
    .string()
    .refine(
      (val) => EVM_ADDRESS_REGEX.test(val) || SOLANA_ADDRESS_REGEX.test(val),
      "Recipient address must be either a valid EVM address (0x-prefixed) or Solana address (base58)"
    )
    .describe(
      "Recipient address on destination chain. For EVM: use 0x-prefixed address. For Solana: use base58 wallet address."
    ),

  /** Sender's address */
  senderAddress: z
    .string()
    .regex(EVM_ADDRESS_REGEX, "Sender address must be a valid EVM address")
    .refine((addr) => addr !== "0x0000000000000000000000000000000000000000", {
      message: "Sender address cannot be the zero address",
    })
    .describe("The user's wallet address that will sign and send the transaction on the source chain"),

  /** Authority address on the source chain */
  srcChainOrderAuthorityAddress: z
    .string()
    .regex(EVM_ADDRESS_REGEX, "Authority address must be a valid EVM address")
    .refine((addr) => addr !== "0x0000000000000000000000000000000000000000", {
      message: "Authority address cannot be the zero address",
    })
    .describe(
      "Optional: The user's wallet address that can cancel/modify the order. If not provided, defaults to senderAddress."
    )
    .optional(),

  /** Refund address on the source chain */
  srcChainRefundAddress: z
    .string()
    .regex(EVM_ADDRESS_REGEX, "Refund address must be a valid EVM address")
    .refine((addr) => addr !== "0x0000000000000000000000000000000000000000", {
      message: "Refund address cannot be the zero address",
    })
    .describe(
      "Optional: The user's wallet address to receive refunds if the transaction fails. Defaults to senderAddress."
    )
    .optional(),

  /** Authority address on the destination chain */
  dstChainOrderAuthorityAddress: z
    .string()
    .refine(
      (val) => EVM_ADDRESS_REGEX.test(val) || SOLANA_ADDRESS_REGEX.test(val),
      "Authority address must be either a valid EVM address (0x-prefixed) or Solana address (base58)"
    )
    .refine((addr) => addr !== "0x0000000000000000000000000000000000000000", {
      message: "Authority address cannot be the zero address",
    })
    .describe("Optional: Authority address on destination chain. Defaults to dstChainTokenOutRecipient.")
    .optional(),

  /** Optional referral code */
  referralCode: z.string().optional().describe("Referral code for earning additional deBridge points"),

  /** Optional slippage percentage */
  slippage: z
    .string()
    .pipe(z.coerce.number().min(0).max(100).transform(String))
    .optional()
    .describe("Slippage tolerance percentage (0-100)"),

  /** Whether to include operating expenses */
  prependOperatingExpenses: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Whether to include operating expenses in the transaction. Always true for native token transfers."
    ),

  /** Optional app identifier */
  deBridgeApp: z.string().optional(),
}).superRefine((data, ctx) => {
  // Check that source and destination chains are different
  if (data.srcChainId === data.dstChainId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Source and destination chains must be different",
      path: ["dstChainId"],
    });
  }
});

/**
 * Schema for execute_bridge_transaction tool parameters
 */
export const executeBridgeTransactionSchema = z.object({
  /** Transaction data from create_bridge_order */
  txData: z.object({
    /** Target address for the transaction */
    to: z.string().regex(EVM_ADDRESS_REGEX, "Contract address must be a valid EVM address"),
    
    /** Transaction data */
    data: z.string().regex(/^0x[a-fA-F0-9]*$/, "Transaction data must be valid hex"),
    
    /** Transaction value (for native token transfers) */
    value: z
      .string()
      .pipe(z.coerce.number().nonnegative().int().transform(String))
      .optional()
      .describe("Value must be a non-negative integer in wei"),
  }).describe("Transaction data from createBridgeOrder"),
  chainId: z.string().optional(),
});

/**
 * Represents a single chain in the supported chains response
 */
export interface ChainInfo {
  chainId: string;
  originalChainId: string;
  chainName: string;
  chainType?: 'evm' | 'solana';
  nativeToken?: {
    symbol: string;
    name: string;
    decimals: number;
  };
  explorerUrl?: string;
  rpcUrl?: string;
  isTestnet?: boolean;
}

/**
 * Response from the supported-chains-info endpoint
 */
export interface SupportedChainsInfoResponse {
  chains: ChainInfo[];
}

/**
 * Type definitions for tool parameters
 */
export type SearchTokenParams = z.infer<typeof searchTokenSchema>;
export type GetBridgeQuoteParams = z.infer<typeof getBridgeQuoteSchema>;
export type CreateBridgeOrderParams = z.infer<typeof createBridgeOrderSchema>;
export type ExecuteBridgeTransactionParams = z.infer<typeof executeBridgeTransactionSchema>;
