/**
 * Handler implementations for DeBridge MCP tools
 */

import { Client, PublicActions, WalletActions } from "viem";
import { DEBRIDGE_API_BASE_URL, DEFAULT_REFERRAL_CODE, CHAIN_IDS } from "../lib/constants.js";
import {
  SearchTokenParams,
  GetBridgeQuoteParams,
  CreateBridgeOrderParams,
  ExecuteBridgeTransactionParams,
  SupportedChainsInfoResponse,
  CheckTransactionStatusParams,
  OrderStatusResponse,
  OrderIdsResponse
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
    // Create URL parameters
    const urlParams = new URLSearchParams();
    urlParams.append("srcChainId", params.srcChainId);
    urlParams.append("srcChainTokenIn", params.srcChainTokenIn);
    urlParams.append("srcChainTokenInAmount", params.srcChainTokenInAmount);
    urlParams.append("dstChainId", params.dstChainId);
    urlParams.append("dstChainTokenOut", params.dstChainTokenOut);
    urlParams.append("dstChainTokenOutRecipient", params.dstChainTokenOutRecipient);
    urlParams.append("senderAddress", params.senderAddress);
    urlParams.append("srcChainOrderAuthorityAddress", params.srcChainOrderAuthorityAddress || params.senderAddress);
    urlParams.append("srcChainRefundAddress", params.senderAddress);
    urlParams.append("dstChainOrderAuthorityAddress", params.dstChainTokenOutRecipient);
    urlParams.append("referralCode", String(DEFAULT_REFERRAL_CODE));
    urlParams.append("prependOperatingExpenses", "true");
    
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
    
    // For Solana transactions, we use the Solana chain ID
    // For EVM transactions, we need to determine the chain ID from the transaction data
    // or from the 'to' address network
    let chainId: string;
    
    if (chainType === 'solana') {
      // Use Solana chain ID
      chainId = String(CHAIN_IDS.SOLANA);
      console.log(`Detected Solana transaction, using chain ID: ${chainId}`);
    } else {
      // For EVM, try to determine the chain from params or use a default
      if (params.chainId) {
        chainId = params.chainId;
      } else if ('chainId' in txData && txData.chainId) {
        chainId = String(txData.chainId);
      } else {
        // If no chain ID is provided, try to determine it from supported chains
        // This is a simplified approach - in production, you would use more sophisticated chain detection
        console.log("No chain ID provided, attempting to determine from supported chains...");
        try {
          const supportedChains = await getSupportedChainsHandler();
          // This is a simplified approach to find a matching chain
          // In production, you would use more sophisticated chain detection
          const matchingChain = supportedChains.chains.find(chain => 
            chain.chainType === 'evm' && 
            chain.nativeToken && 
            chain.nativeToken.symbol
          );
          
          if (matchingChain) {
            chainId = matchingChain.chainId;
            console.log(`Determined chain ID from supported chains: ${chainId}`);
          } else {
            // Default to Ethereum if we can't determine the chain
            chainId = String(CHAIN_IDS.ETHEREUM);
            console.log(`Could not determine chain ID, defaulting to Ethereum: ${chainId}`);
          }
        } catch (error) {
          // If we can't get supported chains, default to Ethereum
          chainId = String(CHAIN_IDS.ETHEREUM);
          console.log(`Error determining chain ID, defaulting to Ethereum: ${chainId}`);
        }
      }
    }
    
    // Create the appropriate wallet provider based on chain type and ID
    console.log(`Creating wallet provider for chain ID: ${chainId}`);
    const walletProvider = await createWalletProvider(seedPhrase, chainId);
    
    // Prepare transaction parameters based on chain type
    const txParams: any = {
      to: txData.to,
      data: txData.data,
    };
    
    // Add value for EVM transactions if provided
    if (chainType === 'evm' && txData.value) {
      txParams.value = txData.value;
    }
    
    // Add gas limit for EVM transactions if provided
    if (chainType === 'evm' && 'gasLimit' in txData && txData.gasLimit) {
      txParams.gas = txData.gasLimit;
    }
    
    // Send the transaction using the wallet provider
    console.log(`Sending transaction with params:`, {
      to: txParams.to,
      dataLength: txParams.data.length,
      value: txParams.value,
      gas: txParams.gas
    });
    
    const hash = await walletProvider.sendTransaction(txParams);
    
    console.log(`Transaction sent successfully: ${hash}`);
    return { 
      hash,
      chainId,
      chainType
    };
  } catch (error) {
    console.error("Error executing bridge transaction:", error);
    // Provide more detailed error information
    if (error instanceof Error) {
      throw new Error(`Failed to execute bridge transaction: ${error.message}`);
    }
    throw new Error(`Failed to execute bridge transaction: ${String(error)}`);
  }
}

/**
 * Fetches the list of supported chains from the DLN API
 * @returns A promise that resolves to the list of supported chains
 */
export async function getSupportedChainsHandler(): Promise<SupportedChainsInfoResponse> {
  try {
    // Try to fetch from API first
    const url = `${DEBRIDGE_API_BASE_URL}/supported-chains-info`;
    console.log("Fetching supported chains from:", url);

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      console.error(`HTTP error! status: ${response.status}, body: ${text}`);
      throw new Error(`Failed to fetch supported chains: ${text}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching supported chains:", error);
    throw error;
  }
}

/**
 * Check the status of a DeBridge transaction
 * @param params Parameters containing the transaction hash
 * @returns Status information for the transaction and associated orders
 */
export async function checkTransactionStatusHandler(
  params: CheckTransactionStatusParams
): Promise<OrderStatusResponse[]> {
  try {
    // First get the order IDs for the transaction
    const orderIdsUrl = `${DEBRIDGE_API_BASE_URL}/dln/tx/${params.txHash}/order-ids`;
    console.log("Getting order IDs from:", orderIdsUrl);

    const orderIdsResponse = await fetch(orderIdsUrl);
    if (!orderIdsResponse.ok) {
      const text = await orderIdsResponse.text();
      throw new Error(`HTTP error! status: ${orderIdsResponse.status}, body: ${text}`);
    }

    const orderIdsData = await orderIdsResponse.json() as OrderIdsResponse;
    console.log("Order IDs response:", JSON.stringify(orderIdsData, null, 2));

    if (!orderIdsData.orderIds || orderIdsData.orderIds.length === 0) {
      throw new Error("No order IDs found for this transaction");
    }

    // Then get the status for each order
    const statuses = await Promise.all(
      orderIdsData.orderIds.map(async (orderId) => {
        const statusUrl = `${DEBRIDGE_API_BASE_URL}/dln/order/${orderId}/status`;
        console.log("Getting status from:", statusUrl);

        const statusResponse = await fetch(statusUrl);
        if (!statusResponse.ok) {
          const text = await statusResponse.text();
          throw new Error(`HTTP error! status: ${statusResponse.status}, body: ${text}`);
        }

        const statusData = await statusResponse.json() as OrderStatusResponse;
        // Add the deBridge app link
        statusData.orderLink = `https://app.debridge.finance/order?orderId=${orderId}`;
        console.log("Status response:", JSON.stringify(statusData, null, 2));
        return statusData;
      })
    );

    return statuses;
  } catch (error) {
    console.error("Failed to check transaction status:", error);
    throw new Error(`Failed to check transaction status: ${error}`);
  }
}
