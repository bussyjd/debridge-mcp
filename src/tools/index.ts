/**
 * Tool definitions and exports for DeBridge MCP server
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  searchTokenHandler,
  getBridgeQuoteHandler,
  createBridgeOrderHandler,
  executeBridgeTransactionHandler,
  getSupportedChainsHandler,
} from "./handlers.js";

/**
 * Tool for searching tokens on a specific chain
 */
const searchTokenTool: Tool = {
  name: "search_token",
  description: "Search for tokens on a specific blockchain. For EVM chains, use 0x-prefixed addresses. For Solana, use base58 addresses.",
  inputSchema: {
    type: "object",
    properties: {
      chainId: {
        type: "string",
        description: "Chain ID to search tokens on (e.g., '1' for Ethereum, '56' for BSC, '7565164' for Solana)",
      },
      search: {
        type: "string",
        description: "Optional search term to filter tokens by symbol (e.g., 'USDC', 'ETH')",
      },
    },
    required: ["chainId"],
  },
};

/**
 * Tool for getting a bridge quote
 */
const getBridgeQuoteTool: Tool = {
  name: "get_bridge_quote",
  description: "Get a quote for bridging tokens between chains. Use search_token first to get correct token addresses.",
  inputSchema: {
    type: "object",
    properties: {
      srcChainId: {
        type: "string",
        description: "Source chain ID (e.g., '1' for Ethereum)",
      },
      srcChainTokenIn: {
        type: "string",
        description: "Token address on source chain. For EVM: use 0x0000000000000000000000000000000000000000 for native token.",
      },
      srcChainTokenInAmount: {
        type: "string",
        description: "Amount of input tokens in base units (e.g., wei for ETH, 10^6 for USDT)",
      },
      dstChainId: {
        type: "string",
        description: "Destination chain ID (e.g., '56' for BSC, '7565164' for Solana)",
      },
      dstChainTokenOut: {
        type: "string",
        description: "Token address on destination chain",
      },
      slippage: {
        type: "string",
        description: "Optional slippage tolerance percentage (0-100)",
      },
    },
    required: ["srcChainId", "srcChainTokenIn", "srcChainTokenInAmount", "dstChainId", "dstChainTokenOut"],
  },
};

/**
 * Tool for creating a bridge order
 */
const createBridgeOrderTool: Tool = {
  name: "create_bridge_order",
  description: `Create a bridge order to transfer tokens between chains.
Use the target asset's full address (e.g., 0xdAC17F958D2ee523a2206206994597C13D831ec7) for dstChainTokenOut, not the ticker (e.g., USDT).

EVM to EVM:
- Set dstChainTokenOutRecipient to recipient's EVM address
- Set dstChainTokenOut to the ERC-20 format address of the token to receive

To Solana (7565164):
- Set dstChainTokenOutRecipient to Solana recipient address (base58)
- Set dstChainTokenOut to the base58 address of the token to receive on Solana

From Solana:
- Set dstChainTokenOutRecipient to EVM recipient address (0x-prefixed)
- Set dstChainTokenOut to the ERC-20 format address of the token to receive`,
  inputSchema: {
    type: "object",
    properties: {
      srcChainId: {
        type: "string",
        description: "Source chain ID (e.g., '1' for Ethereum, '56' for BSC)",
      },
      srcChainTokenIn: {
        type: "string",
        description: "Token address on source chain. For EVM: use 0x0000000000000000000000000000000000000000 for native token.",
      },
      srcChainTokenInAmount: {
        type: "string",
        description: "Amount of input tokens in base units (e.g., wei for ETH, 10^6 for USDT)",
      },
      dstChainId: {
        type: "string",
        description: "Destination chain ID (e.g., '56' for BSC, '7565164' for Solana)",
      },
      dstChainTokenOut: {
        type: "string",
        description: "Token address on destination chain",
      },
      dstChainTokenOutRecipient: {
        type: "string",
        description: "Recipient address on destination chain. For EVM: use 0x-prefixed address. For Solana: use base58 wallet address.",
      },
      senderAddress: {
        type: "string",
        description: "Sender's address on the source chain",
      },
      referralCode: {
        type: "string",
        description: "Optional referral code for earning additional deBridge points",
      },
      slippage: {
        type: "string",
        description: "Optional slippage tolerance percentage (0-100)",
      },
    },
    required: ["srcChainId", "srcChainTokenIn", "srcChainTokenInAmount", "dstChainId", "dstChainTokenOut", "dstChainTokenOutRecipient", "senderAddress"],
  },
};

/**
 * Tool for executing a bridge transaction
 */
const executeBridgeTransactionTool: Tool = {
  name: "execute_bridge_transaction",
  description: "Execute a bridge transaction using tx data from create_bridge_order tool. Always ask for confirmation before proceeding.",
  inputSchema: {
    type: "object",
    properties: {
      txData: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Target address for the transaction",
          },
          data: {
            type: "string",
            description: "Transaction data",
          },
          value: {
            type: "string",
            description: "Transaction value (for native token transfers)",
          },
          gasLimit: {
            type: "number",
            description: "Gas limit for the transaction",
          },
          chainId: {
            type: "number",
            description: "Chain ID for the transaction",
          },
        },
        required: ["to", "data"],
      },
      chainId: {
        type: "string",
        description: "Chain ID to use for the transaction (overrides txData.chainId if both are provided)",
      },
    },
    required: ["txData"],
  },
};

/**
 * Tool for getting supported chains
 */
const getSupportedChainsTool: Tool = {
  name: "get_supported_chains",
  description: "Get a list of all supported chains with their details including chain IDs, names, and native tokens.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

/**
 * Export all DeBridge MCP tools
 */
export const debridgeMcpTools: Tool[] = [
  searchTokenTool,
  getBridgeQuoteTool,
  createBridgeOrderTool,
  executeBridgeTransactionTool,
  getSupportedChainsTool,
];

/**
 * Map tool names to their handler functions
 */
export const toolToHandler: Record<string, Function> = {
  search_token: searchTokenHandler,
  get_bridge_quote: getBridgeQuoteHandler,
  create_bridge_order: createBridgeOrderHandler,
  execute_bridge_transaction: executeBridgeTransactionHandler,
  get_supported_chains: getSupportedChainsHandler,
};
