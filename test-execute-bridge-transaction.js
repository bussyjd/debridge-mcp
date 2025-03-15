/**
 * Test script for the execute_bridge_transaction functionality
 * 
 * This script tests the DeBridge API directly to verify that the transaction execution
 * works correctly with the data returned from create_bridge_order.
 * 
 * Usage:
 * node test-execute-bridge-transaction.js
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
  srcChainTokenIn: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
  srcChainTokenInAmount: "1000000", // 1 USDC (6 decimals)
  dstChainId: "56", // BNB Chain
  dstChainTokenOut: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC on BSC
  dstChainTokenOutRecipient: account.address, // Use the wallet address as recipient
  senderAddress: account.address, // Use the wallet address as sender
  // Optional parameters
  srcChainOrderAuthorityAddress: account.address,
  srcChainRefundAddress: account.address,
  dstChainOrderAuthorityAddress: account.address,
  referralCode: DEFAULT_REFERRAL_CODE,
  slippage: "0.5",
  deBridgeApp: "GOAT", // Using GOAT app (valid value from allowed list)
};

/**
 * Create a bridge order for cross-chain token transfers
 * @param {Object} params Bridge order parameters
 * @returns {Promise<Object>} Order details including transaction data
 */
async function createBridgeOrder(params) {
  try {
    console.log("Creating bridge order with parameters:", JSON.stringify(params, null, 2));

    // Construct URL with parameters
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        urlParams.append(key, value);
      }
    });

    const apiUrl = `${DEBRIDGE_API_BASE_URL}/v1.0/dln/order/create-tx?${urlParams.toString()}`;
    console.log("API URL:", apiUrl);

    // Make API request
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("API Error:", data);
      throw new Error(`API request failed: ${data.message || JSON.stringify(data)}`);
    }

    console.log("Bridge order created successfully!");
    return data;
  } catch (error) {
    console.error("Error creating bridge order:", error);
    throw error;
  }
}

/**
 * Execute a bridge transaction
 * @param {Object} txData Transaction data from create_bridge_order
 * @returns {Promise<Object>} Transaction hash and status
 */
async function executeBridgeTransaction(txData) {
  try {
    console.log("Executing bridge transaction with data:", JSON.stringify(txData, null, 2));

    // Validate transaction data
    if (!txData.to || !txData.data) {
      throw new Error("Invalid transaction data: missing 'to' or 'data' field");
    }

    // Validate data format
    if (!txData.data.startsWith("0x")) {
      throw new Error("Invalid transaction data: 'data' field must start with '0x'");
    }

    // Enhanced logging for debugging
    console.log("Transaction details:", {
      to: txData.to,
      value: txData.value ? `${txData.value} (${BigInt(txData.value || "0")})` : "undefined",
      data: {
        full: txData.data,
        functionSelector: txData.data.slice(0, 10),
        parameters: txData.data.slice(10),
      },
    });

    // Send transaction using raw transaction data
    console.log("Sending transaction...");
    const hash = await walletClient.sendTransaction({
      to: txData.to,
      data: txData.data,
      value: txData.value ? BigInt(txData.value) : undefined,
    });

    console.log("Transaction sent! Hash:", hash);
    return { hash };
  } catch (error) {
    console.error("Bridge transaction execution failed:", error);
    throw error;
  }
}

/**
 * Test the execute_bridge_transaction functionality
 */
async function testExecuteBridgeTransaction() {
  try {
    console.log("Starting test for execute_bridge_transaction...");

    // First, create a bridge order to get transaction data
    console.log("Step 1: Creating bridge order to get transaction data...");
    const orderData = await createBridgeOrder(testParams);
    console.log("Order data received:", JSON.stringify(orderData, null, 2));

    if (!orderData.tx) {
      throw new Error("Failed to get transaction data from create_bridge_order");
    }

    // Extract transaction data
    const txData = orderData.tx;
    console.log("Transaction data extracted:", txData);

    // Now execute the bridge transaction
    console.log("Step 2: Executing bridge transaction...");
    const result = await executeBridgeTransaction(txData);
    console.log("Transaction execution result:", result);

    console.log("Test completed successfully!");
    return result;
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
}

// Run the test
testExecuteBridgeTransaction()
  .then(() => {
    console.log("Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
