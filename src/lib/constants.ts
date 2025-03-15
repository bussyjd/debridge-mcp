/**
 * Constants for the DeBridge MCP server
 */

/** DeBridge API base URL */
export const DEBRIDGE_API_BASE_URL = "https://api.dln.trade";

/** Default referral code for DeBridge transactions */
export const DEFAULT_REFERRAL_CODE = 0;

/** Chain IDs for easy reference */
export const CHAIN_IDS = {
  ETHEREUM: 1,
  OPTIMISM: 10,
  BNB_CHAIN: 56,
  POLYGON: 137,
  BASE: 8453,
  ARBITRUM: 42161,
  AVALANCHE: 43114,
  LINEA: 59144,
  SOLANA: 7565164,
  NEON: 100000001,
  GNOSIS: 100000002,
  METIS: 100000004,
  BITROCK: 100000005
};

/** Solana's native token (SOL) address in base58 format */
export const SOLANA_NATIVE_TOKEN = "11111111111111111111111111111111";

/** EVM native token (ETH/BNB/etc) address */
export const EVM_NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

/** Regular expressions for validating addresses */
export const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Chain configuration for supported chains
 */
export const SUPPORTED_CHAINS = [
  {
    chainId: 1,
    chainName: "Ethereum",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo"
  },
  {
    chainId: 56,
    chainName: "BNB Chain",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18
    },
    rpcUrl: "https://bsc-dataseed.binance.org"
  },
  {
    chainId: 137,
    chainName: "Polygon",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18
    },
    rpcUrl: "https://polygon-rpc.com"
  },
  {
    chainId: 42161,
    chainName: "Arbitrum One",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: "https://arb1.arbitrum.io/rpc"
  },
  {
    chainId: 10,
    chainName: "Optimism",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: "https://mainnet.optimism.io"
  },
  {
    chainId: 43114,
    chainName: "Avalanche",
    nativeCurrency: {
      name: "AVAX",
      symbol: "AVAX",
      decimals: 18
    },
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc"
  },
  {
    chainId: 8453,
    chainName: "Base",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: "https://mainnet.base.org"
  },
  {
    chainId: 59144,
    chainName: "Linea",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: "https://rpc.linea.build"
  },
  {
    chainId: 7565164,
    chainName: "Solana",
    nativeCurrency: {
      name: "SOL",
      symbol: "SOL",
      decimals: 9
    },
    rpcUrl: "https://api.mainnet-beta.solana.com"
  }
];
