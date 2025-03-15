/**
 * Constants for the DeBridge MCP server
 */

/** DeBridge API base URL */
export const DEBRIDGE_API_BASE_URL = "https://api.dln.trade/v1.0";

/** Default referral code for DeBridge transactions */
export const DEFAULT_REFERRAL_CODE = "21064";

/** Solana's native token (SOL) address in base58 format */
export const SOLANA_NATIVE_TOKEN = "11111111111111111111111111111111";

/** EVM native token (ETH/BNB/etc) address */
export const EVM_NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

/** Regular expressions for validating addresses */
export const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/** Chain ID mappings for common networks */
export const CHAIN_IDS = {
  ETHEREUM: "1",
  OPTIMISM: "10",
  BNB_CHAIN: "56",
  POLYGON: "137",
  BASE: "8453",
  ARBITRUM: "42161",
  AVALANCHE: "43114",
  LINEA: "59144",
  SOLANA: "7565164",
  NEON: "100000001",
  GNOSIS: "100000002",
  METIS: "100000004",
  BITROCK: "100000005"
};
