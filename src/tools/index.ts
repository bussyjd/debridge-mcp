/**
 * Tool definitions and exports for the deBridge MCP server.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  createTxWithReferralHandler,
  getOrdersByReferralCodeHandler,
  getSupportedChainsHandler,
  preflightSourceTxHandler,
  searchTokenHandler,
} from "./handlers.js";

const searchTokenTool: Tool = {
  name: "search_token",
  description:
    "Search for tokens on a deBridge-supported chain. Use this before creating a transaction.",
  inputSchema: {
    type: "object",
    properties: {
      chainId: {
        type: "string",
        description: "Chain ID to search tokens on, for example 8453 for Base",
      },
      search: {
        type: "string",
        description: "Optional token symbol search term, for example USDC or OBOL",
      },
    },
    required: ["chainId"],
  },
};

const getSupportedChainsTool: Tool = {
  name: "get_supported_chains",
  description: "Get deBridge-supported chains from the DLN API.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

const createTxWithReferralTool: Tool = {
  name: "create_tx_with_referral",
  description:
    "Create an unsigned DLN transaction payload and always include a deBridge referral code. This tool never signs or submits transactions.",
  inputSchema: {
    type: "object",
    properties: {
      srcChainId: { type: "string", description: "Source chain ID" },
      srcChainTokenIn: { type: "string", description: "Source token address" },
      srcChainTokenInAmount: {
        type: "string",
        description: "Input amount in source token base units",
      },
      dstChainId: { type: "string", description: "Destination chain ID" },
      dstChainTokenOut: {
        type: "string",
        description: "Destination token address",
      },
      dstChainTokenOutAmount: {
        type: "string",
        description: "Destination output amount in base units, or auto",
        default: "auto",
      },
      dstChainTokenOutRecipient: {
        type: "string",
        description: "Destination recipient address",
      },
      senderAddress: {
        type: "string",
        description: "Source-chain sender address",
      },
      srcChainOrderAuthorityAddress: {
        type: "string",
        description: "Optional source-chain order authority; defaults to senderAddress",
      },
      srcChainRefundAddress: {
        type: "string",
        description: "Optional source-chain refund address; defaults to senderAddress",
      },
      dstChainOrderAuthorityAddress: {
        type: "string",
        description:
          "Optional destination-chain order authority; defaults to dstChainTokenOutRecipient",
      },
      referralCode: {
        type: "string",
        description:
          "deBridge referral code. If omitted, DEBRIDGE_REFERRAL_CODE must be configured.",
      },
      slippage: {
        type: "number",
        description: "Optional slippage percentage between 0 and 100",
      },
      prependOperatingExpenses: {
        type: "boolean",
        description: "Whether DLN should prepend operating expenses",
        default: true,
      },
      additionalTakerRewardBps: {
        type: "number",
        description: "Optional additional taker reward in basis points",
      },
      deBridgeApp: {
        type: "string",
        description: "Optional deBridge app identifier",
      },
    },
    required: [
      "srcChainId",
      "srcChainTokenIn",
      "srcChainTokenInAmount",
      "dstChainId",
      "dstChainTokenOut",
      "dstChainTokenOutRecipient",
      "senderAddress",
    ],
  },
};

const preflightSourceTxTool: Tool = {
  name: "preflight_source_tx",
  description:
    "Run read-only eRPC/RPC checks for native balance, ERC-20 token balance, and ERC-20 allowance before a DLN source transaction is signed elsewhere.",
  inputSchema: {
    type: "object",
    properties: {
      chainId: { type: "string", description: "Source EVM chain ID" },
      ownerAddress: {
        type: "string",
        description: "Wallet that will submit the source transaction",
      },
      tokenAddress: {
        type: "string",
        description:
          "Source ERC-20 token address, or 0x0000000000000000000000000000000000000000 for native",
      },
      tokenAmount: {
        type: "string",
        description: "Required source token amount in base units",
      },
      spenderAddress: {
        type: "string",
        description: "Approval spender, usually create_tx_with_referral.spenderAddress",
      },
      txValue: {
        type: "string",
        description: "Native value required by the unsigned DLN transaction",
      },
      rpcUrl: {
        type: "string",
        description:
          "Optional source-chain eRPC/RPC URL. Defaults to DEBRIDGE_RPC_URL_<chainId> or EVM_RPC_URL_<chainId>.",
      },
    },
    required: [
      "chainId",
      "ownerAddress",
      "tokenAddress",
      "tokenAmount",
      "spenderAddress",
      "txValue",
    ],
  },
};

const getOrdersByReferralCodeTool: Tool = {
  name: "get_orders_by_referral_code",
  description:
    "Look up deBridge orders attributed to a referral code through the DLN stats API.",
  inputSchema: {
    type: "object",
    properties: {
      referralCode: {
        type: "string",
        description:
          "deBridge referral code. If omitted, DEBRIDGE_REFERRAL_CODE must be configured.",
      },
      giveChainIds: {
        type: "array",
        items: { type: "number" },
        description: "Optional source chain ID filter",
      },
      orderStates: {
        type: "array",
        items: { type: "string" },
        description: "Optional order states filter",
      },
      externalCallStates: {
        type: "array",
        items: { type: "string" },
        description: "Optional external call states filter",
      },
      skip: { type: "number", description: "Pagination offset", default: 0 },
      take: {
        type: "number",
        description: "Page size, max 100",
        default: 20,
      },
      blockTimestampFrom: {
        type: "number",
        description: "Optional minimum source block timestamp",
      },
    },
    required: [],
  },
};

export const debridgeMcpTools: Tool[] = [
  getSupportedChainsTool,
  searchTokenTool,
  createTxWithReferralTool,
  preflightSourceTxTool,
  getOrdersByReferralCodeTool,
];

export const toolToHandler: Record<string, (args: unknown) => Promise<unknown>> = {
  get_supported_chains: getSupportedChainsHandler,
  search_token: searchTokenHandler,
  create_tx_with_referral: createTxWithReferralHandler,
  preflight_source_tx: preflightSourceTxHandler,
  get_orders_by_referral_code: getOrdersByReferralCodeHandler,
};
