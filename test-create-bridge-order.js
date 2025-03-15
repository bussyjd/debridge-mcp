/**
 * Test script for the create_bridge_order functionality
 * 
 * This script tests the DeBridge API directly to verify that the parameters
 * for creating a bridge order match the expected format.
 * 
 * Usage:
 * node test-create-bridge-order.js
 */

import dotenv from "dotenv";
import { createWalletClient, http } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

// Load environment variables
dotenv.config();

// Check for required environment variables
if (!process.env.SEED_PHRASE) {
  console.error("Error: SEED_PHRASE environment variable is required");
  process.exit(1);
}

// Create wallet client from seed phrase
const account = mnemonicToAccount(process.env.SEED_PHRASE);
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http(),
});

// DeBridge API base URL
const DEBRIDGE_API_BASE_URL = "https://api.dln.trade";
const DEFAULT_REFERRAL_CODE = "5"; // Default referral code

// Sample parameters for create_bridge_order
const testParams = {
  srcChainId: "1", // Ethereum
  srcChainTokenIn: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT on Ethereum
  srcChainTokenInAmount: "1000000", // 1 USDT (6 decimals)
  dstChainId: "56", // BNB Chain
  dstChainTokenOut: "0x55d398326f99059fF775485246999027B3197955", // USDT on BSC
  dstChainTokenOutRecipient: account.address, // Use the wallet address as recipient
  senderAddress: account.address, // Use the wallet address as sender
  // Optional parameters
  srcChainOrderAuthorityAddress: account.address,
  srcChainRefundAddress: account.address,
  dstChainOrderAuthorityAddress: account.address,
  referralCode: "123456",
  slippage: "0.5",
  prependOperatingExpenses: true,
  deBridgeApp: "GOAT" // Using GOAT as it's one of the allowed values
};

/**
 * Create a bridge order for cross-chain token transfers
 * @param params Bridge order parameters
 * @returns Order details including transaction data
 */
async function createBridgeOrder(params) {
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
    
    // Optional parameters
    urlParams.append("referralCode", params.referralCode || DEFAULT_REFERRAL_CODE);
    
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

    const url = `${DEBRIDGE_API_BASE_URL}/v1.0/dln/order/create-tx?${urlParams}`;
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

// Test the create_bridge_order functionality
async function testCreateBridgeOrder() {
  console.log("Testing create_bridge_order with parameters:", JSON.stringify(testParams, null, 2));
  
  try {
    const result = await createBridgeOrder(testParams);
    console.log("Create bridge order successful!");
    console.log("Result:", JSON.stringify(result, null, 2));
    
    // Extract key information
    if (result.tx) {
      console.log("\nTransaction Details:");
      console.log("- To:", result.tx.to);
      console.log("- Value:", result.tx.value || "0");
      console.log("- Data:", result.tx.data ? `${result.tx.data.slice(0, 10)}...` : "None");
    }
    
    if (result.orderId) {
      console.log("\nOrder ID:", result.orderId);
    }
    
    return result;
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
}

// Run the test
testCreateBridgeOrder()
  .then(() => {
    console.log("Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed with error:", error);
    process.exit(1);
  });
