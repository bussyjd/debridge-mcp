/**
 * Handler implementations for DeBridge MCP tools
 */

import { Client, PublicActions, WalletActions } from "viem";
import { DEBRIDGE_API_BASE_URL, DEFAULT_REFERRAL_CODE } from "../lib/constants.js";
import {
  SearchTokenParams,
  GetBridgeQuoteParams,
  CreateBridgeOrderParams,
  ExecuteBridgeTransactionParams,
} from "./schemas.js";
import { createWalletProvider, getChainTypeFromAddress } from '../lib/wallet.js';

/**
 * Interface for token information
 */
interface TokenInfo {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
}

/**
 * Type for wallet client with required actions
 */
type WalletClient = Client & PublicActions & WalletActions;

/**
 * Search for tokens on a specific chain
 * @param walletClient Viem wallet client
 * @param params Search parameters
 * @returns Matching tokens with their details
 */
export async function searchTokenHandler(
  walletClient: WalletClient,
  params: SearchTokenParams
) {
  try {
    const url = `${DEBRIDGE_API_BASE_URL}/token-list?chainId=${params.chainId}`;
    console.log("Fetching token information from:", url);

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
    }

    const responseData = await response.json();
    const data = responseData.tokens;

    // If no search term, return all tokens
    if (!params.search) {
      return { tokens: data };
    }

    // Filter tokens by search term
    const searchTerm = params.search.toLowerCase();
    const tokens = Object.entries(data as Record<string, TokenInfo>)
      .filter(
        ([, token]: [string, TokenInfo]) =>
          token.symbol && token.symbol.toLowerCase().includes(searchTerm)
      )
      .reduce(
        (acc, [address, token]: [string, TokenInfo]) => {
          acc[address] = {
            name: token.name,
            symbol: token.symbol,
            address,
            decimals: token.decimals,
          };
          return acc;
        },
        {} as Record<string, TokenInfo>
      );

    // Log matched tokens
    const matchedTokens = Object.values(tokens);
    if (matchedTokens.length > 0) {
      console.log(
        `Found ${matchedTokens.length} token(s) matching "${searchTerm}":`,
        JSON.stringify(matchedTokens, null, 2)
      );
    }

    return { tokens };
  } catch (error) {
    console.error("Error searching for tokens:", error);
    throw error;
  }
}

/**
 * Get a quote for bridging tokens between chains
 * @param walletClient Viem wallet client
 * @param params Bridge quote parameters
 * @returns Quote information including estimated amounts and fees
 */
export async function getBridgeQuoteHandler(
  walletClient: WalletClient,
  params: GetBridgeQuoteParams
) {
  try {
    const isSameChain = params.srcChainId === params.dstChainId;
    const userAddress = await walletClient.getAddresses().then((addresses: `0x${string}`[]) => addresses[0]);

    const url = isSameChain
      ? `${DEBRIDGE_API_BASE_URL}/chain/transaction?${new URLSearchParams({
          chainId: params.srcChainId,
          tokenIn: params.srcChainTokenIn,
          tokenInAmount: params.srcChainTokenInAmount,
          tokenOut: params.dstChainTokenOut,
          tokenOutRecipient: userAddress,
          slippage: params.slippage?.toString() || "auto",
          affiliateFeePercent: "0",
        })}`
      : `${DEBRIDGE_API_BASE_URL}/dln/order/create-tx?${new URLSearchParams({
          srcChainId: params.srcChainId,
          srcChainTokenIn: params.srcChainTokenIn,
          srcChainTokenInAmount: params.srcChainTokenInAmount,
          dstChainId: params.dstChainId,
          dstChainTokenOut: params.dstChainTokenOut,
          dstChainTokenOutAmount: "auto",
          prependOperatingExpenses: "true",
          additionalTakerRewardBps: "0",
        })}`;

    console.log("Making request to:", url);

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
    }

    const data = await response.json();
    console.log("Bridge quote response:", JSON.stringify(data, null, 2));
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error) {
    console.error("Error getting bridge quote:", error);
    throw new Error(`Failed to get bridge quote: ${error}`);
  }
}

/**
 * Create a bridge order for cross-chain token transfers
 * @param walletClient Viem wallet client
 * @param params Bridge order parameters
 * @returns Order details including transaction data
 */
export async function createBridgeOrderHandler(
  walletClient: WalletClient,
  params: CreateBridgeOrderParams
) {
  try {
    const urlParams = new URLSearchParams();
    
    // Required parameters
    urlParams.append("srcChainId", params.srcChainId);
    urlParams.append("srcChainTokenIn", params.srcChainTokenIn);
    urlParams.append("srcChainTokenInAmount", params.srcChainTokenInAmount);
    urlParams.append("dstChainId", params.dstChainId);
    urlParams.append("dstChainTokenOut", params.dstChainTokenOut);
    urlParams.append("dstChainTokenOutRecipient", params.dstChainTokenOutRecipient);
    urlParams.append("senderAddress", params.senderAddress);
    
    // Source chain authority addresses
    if (params.srcChainOrderAuthorityAddress) {
      urlParams.append("srcChainOrderAuthorityAddress", params.srcChainOrderAuthorityAddress);
    } else {
      urlParams.append("srcChainOrderAuthorityAddress", params.senderAddress);
    }
    
    // Source chain refund address
    if (params.srcChainRefundAddress) {
      urlParams.append("srcChainRefundAddress", params.srcChainRefundAddress);
    } else {
      urlParams.append("srcChainRefundAddress", params.senderAddress);
    }
    
    // Destination chain authority address
    if (params.dstChainOrderAuthorityAddress) {
      urlParams.append("dstChainOrderAuthorityAddress", params.dstChainOrderAuthorityAddress);
    } else {
      urlParams.append("dstChainOrderAuthorityAddress", params.dstChainTokenOutRecipient);
    }
    
    // Add referral code if not provided
    if (!params.referralCode) {
      params.referralCode = DEFAULT_REFERRAL_CODE.toString();
    }
    urlParams.append("referralCode", params.referralCode);
    
    // Operating expenses
    const prependOperatingExpenses = params.prependOperatingExpenses !== undefined 
      ? params.prependOperatingExpenses.toString() 
      : "true";
    urlParams.append("prependOperatingExpenses", prependOperatingExpenses);
    
    // Slippage
    if (params.slippage) {
      urlParams.append("slippage", params.slippage);
    }
    
    // App identifier
    if (params.deBridgeApp) {
      urlParams.append("deBridgeApp", params.deBridgeApp);
    }

    const url = `${DEBRIDGE_API_BASE_URL}/dln/order/create-tx?${urlParams}`;
    console.log("Making create bridge order request to:", url);

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    // Format the txData to ensure it's properly stringified
    if (data.tx?.data) {
      data.tx.data = data.tx.data.toString();
    }

    return data;
  } catch (error) {
    console.error("Error creating bridge order:", error);
    throw new Error(`Failed to create bridge order: ${error}`);
  }
}

/**
 * Execute a bridge transaction
 * @param walletClient Viem wallet client
 * @param params Bridge transaction parameters
 * @returns Transaction hash and confirmation status
 */
export async function executeBridgeTransactionHandler(
  walletClient: any,
  params: ExecuteBridgeTransactionParams
) {
  const { txData } = params;

  // Validate transaction data
  if (!txData.to || !txData.data) {
    throw new Error("Invalid transaction data: missing 'to' or 'data' field");
  }

  console.log(`Executing bridge transaction to ${txData.to}`);
  console.log(`Transaction data: ${txData.data.slice(0, 50)}...`);
  
  try {
    // Determine chain type based on the 'to' address
    const chainType = getChainTypeFromAddress(txData.to);
    
    // Get the seed phrase from environment variables
    const seedPhrase = process.env.SEED_PHRASE;
    if (!seedPhrase) {
      throw new Error("SEED_PHRASE environment variable is required");
    }
    
    // Create the appropriate wallet provider based on chain type
    // For simplicity, we're using chainId 1 (Ethereum) for EVM transactions
    // In a production environment, you would determine the correct chainId
    const walletProvider = await createWalletProvider(
      seedPhrase,
      chainType === 'solana' ? 7565164 : 1
    );
    
    // Send the transaction using the wallet provider
    const hash = await walletProvider.sendTransaction({
      to: txData.to,
      data: txData.data,
      value: txData.value,
    });
    
    console.log(`Transaction sent successfully: ${hash}`);
    return { hash };
  } catch (error) {
    console.error("Error executing bridge transaction:", error);
    throw error;
  }
}
