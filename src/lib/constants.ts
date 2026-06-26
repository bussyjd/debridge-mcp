/**
 * Constants for the deBridge MCP server.
 */

/** Versioned DLN API base URL. Override for staging or mocks with DLN_API_BASE_URL. */
export const DLN_API_BASE_URL =
  process.env.DLN_API_BASE_URL?.replace(/\/$/, "") ||
  "https://dln.debridge.finance/v1.0";

/** deBridge stats API base URL. Override with DLN_STATS_API_BASE_URL. */
export const DLN_STATS_API_BASE_URL =
  process.env.DLN_STATS_API_BASE_URL?.replace(/\/$/, "") ||
  "https://stats-api.dln.trade/api";

/** EVM native token (ETH/BNB/etc) address */
export const EVM_NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

/** Regular expressions for validating addresses */
export const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "allowance", type: "uint256" }],
  },
] as const;
