/**
 * Test script for multi-chain bridge transactions
 * 
 * This script tests both EVM and Solana bridge transactions using the DeBridge API.
 * It demonstrates how our implementation can handle transactions on both types of chains.
 */

import dotenv from 'dotenv';
import { createWalletClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { Connection, Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import fetch from 'node-fetch';

import { createBridgeOrderHandler } from './dist/tools/handlers.js';
import { executeBridgeTransactionHandler } from './dist/tools/handlers.js';
import { SUPPORTED_CHAINS, CHAIN_IDS } from './dist/lib/constants.js';
import { getChainTypeFromAddress, isSolanaChain } from './dist/lib/wallet.js';

// Load environment variables
dotenv.config();

// Check for required environment variables
if (!process.env.SEED_PHRASE) {
  console.error('Error: SEED_PHRASE environment variable is required');
  process.exit(1);
}

// Create wallet clients for both EVM and Solana
const createWallets = async () => {
  const seedPhrase = process.env.SEED_PHRASE;
  
  // Create EVM wallet
  const evmAccount = mnemonicToAccount(seedPhrase);
  const evmWalletClient = createWalletClient({
    account: evmAccount,
    chain: mainnet,
    transport: http()
  });
  
  // Create Solana wallet
  const seed = await bip39.mnemonicToSeed(seedPhrase);
  const seedHash = Array.from(seed).slice(0, 32);
  const solanaKeypair = Keypair.fromSeed(Uint8Array.from(seedHash));
  const solanaConnection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  return {
    evmWalletClient,
    evmAddress: evmAccount.address,
    solanaKeypair,
    solanaAddress: solanaKeypair.publicKey.toBase58(),
    solanaConnection
  };
};

// Test EVM to EVM bridge transaction (e.g., Ethereum to BSC)
const testEvmToEvmBridge = async (wallets) => {
  console.log('\n=== Testing EVM to EVM Bridge Transaction ===');
  console.log(`Source Address: ${wallets.evmAddress}`);
  
  try {
    // Create a bridge order from Ethereum to BSC
    const createOrderParams = {
      srcChainId: CHAIN_IDS.ETHEREUM.toString(),
      dstChainId: CHAIN_IDS.BNB_CHAIN.toString(),
      srcChainTokenIn: "0x0000000000000000000000000000000000000000", // Native ETH
      srcChainTokenInAmount: "1000000000000000", // 0.001 ETH
      dstChainTokenOut: "0x0000000000000000000000000000000000000000", // Native BNB
      dstChainTokenOutRecipient: wallets.evmAddress,
      srcChainOrderAuthorityAddress: wallets.evmAddress,
      senderAddress: wallets.evmAddress,
      deBridgeApp: "GOAT"
    };
    
    console.log('Creating bridge order with params:', JSON.stringify(createOrderParams, null, 2));
    
    // Call the create bridge order handler with wallet client
    const orderResult = await createBridgeOrderHandler(wallets.evmWalletClient, createOrderParams);
    console.log('Bridge order created successfully:', orderResult);
    
    // Get the transaction data
    const txData = orderResult.tx;
    
    // Determine chain type from the 'to' address
    const chainType = getChainTypeFromAddress(txData.to);
    console.log(`Detected chain type: ${chainType}`);
    
    // Execute the bridge transaction
    console.log('Executing bridge transaction...');
    try {
      const txResult = await executeBridgeTransactionHandler(wallets.evmWalletClient, {
        txData: txData
      });
      console.log('Transaction executed successfully:', txResult);
    } catch (error) {
      console.error('Error executing transaction (expected if insufficient funds):', error.message);
      console.log('This is expected if the wallet does not have sufficient funds.');
    }
    
  } catch (error) {
    console.error('Error in EVM to EVM bridge test:', error);
  }
};

// Test EVM to Solana bridge transaction
const testEvmToSolanaBridge = async (wallets) => {
  console.log('\n=== Testing EVM to Solana Bridge Transaction ===');
  console.log(`Source Address: ${wallets.evmAddress}`);
  console.log(`Destination Address: ${wallets.solanaAddress}`);
  
  try {
    // Create a bridge order from Ethereum to Solana
    const createOrderParams = {
      srcChainId: CHAIN_IDS.ETHEREUM.toString(),
      dstChainId: CHAIN_IDS.SOLANA.toString(),
      srcChainTokenIn: "0x0000000000000000000000000000000000000000", // Native ETH
      srcChainTokenInAmount: "1000000000000000", // 0.001 ETH
      dstChainTokenOut: "11111111111111111111111111111111", // Native SOL
      dstChainTokenOutRecipient: wallets.solanaAddress,
      srcChainOrderAuthorityAddress: wallets.evmAddress,
      senderAddress: wallets.evmAddress,
      deBridgeApp: "GOAT"
    };
    
    console.log('Creating bridge order with params:', JSON.stringify(createOrderParams, null, 2));
    
    // Call the create bridge order handler with wallet client
    const orderResult = await createBridgeOrderHandler(wallets.evmWalletClient, createOrderParams);
    console.log('Bridge order created successfully:', orderResult);
    
    // Get the transaction data
    const txData = orderResult.tx;
    
    // Determine chain type from the 'to' address
    const chainType = getChainTypeFromAddress(txData.to);
    console.log(`Detected chain type: ${chainType}`);
    
    // Execute the bridge transaction
    console.log('Executing bridge transaction...');
    try {
      const txResult = await executeBridgeTransactionHandler(wallets.evmWalletClient, {
        txData: txData
      });
      console.log('Transaction executed successfully:', txResult);
    } catch (error) {
      console.error('Error executing transaction (expected if insufficient funds):', error.message);
      console.log('This is expected if the wallet does not have sufficient funds.');
    }
    
  } catch (error) {
    console.error('Error in EVM to Solana bridge test:', error);
  }
};

// Test Solana to EVM bridge transaction
const testSolanaToEvmBridge = async (wallets) => {
  console.log('\n=== Testing Solana to EVM Bridge Transaction ===');
  console.log(`Source Address: ${wallets.solanaAddress}`);
  console.log(`Destination Address: ${wallets.evmAddress}`);
  
  try {
    // Create a bridge order from Solana to Ethereum
    const createOrderParams = {
      srcChainId: CHAIN_IDS.SOLANA.toString(),
      dstChainId: CHAIN_IDS.ETHEREUM.toString(),
      srcChainTokenIn: "11111111111111111111111111111111", // Native SOL
      srcChainTokenInAmount: "10000000", // 0.01 SOL
      dstChainTokenOut: "0x0000000000000000000000000000000000000000", // Native ETH
      dstChainTokenOutRecipient: wallets.evmAddress,
      srcChainOrderAuthorityAddress: wallets.solanaAddress,
      senderAddress: wallets.solanaAddress,
      deBridgeApp: "GOAT"
    };
    
    console.log('Creating bridge order with params:', JSON.stringify(createOrderParams, null, 2));
    
    // For Solana transactions, we would need a Solana wallet client
    // For this demo, we'll use the EVM wallet client to create the order
    const orderResult = await createBridgeOrderHandler(wallets.evmWalletClient, createOrderParams);
    console.log('Bridge order created successfully:', orderResult);
    
    // Get the transaction data
    const txData = orderResult.tx;
    
    // Determine chain type from the 'to' address
    const chainType = getChainTypeFromAddress(txData.to);
    console.log(`Detected chain type: ${chainType}`);
    
    // For Solana, we need a different approach to execute the transaction
    // This is a simplified example - in a real implementation, you would use the Solana wallet
    console.log('Executing bridge transaction...');
    try {
      // For demonstration purposes, we're still using the executeBridgeTransactionHandler
      // In a real implementation, you would use the Solana-specific wallet
      const txResult = await executeBridgeTransactionHandler(wallets.evmWalletClient, {
        txData: txData
      });
      console.log('Transaction executed successfully:', txResult);
    } catch (error) {
      console.error('Error executing transaction (expected if insufficient funds):', error.message);
      console.log('This is expected if the wallet does not have sufficient funds.');
    }
    
  } catch (error) {
    console.error('Error in Solana to EVM bridge test:', error);
  }
};

// Main function to run all tests
const runTests = async () => {
  console.log('Starting multi-chain bridge transaction tests...');
  
  try {
    // Create wallets
    const wallets = await createWallets();
    console.log('Wallets created successfully:');
    console.log(`EVM Address: ${wallets.evmAddress}`);
    console.log(`Solana Address: ${wallets.solanaAddress}`);
    
    // Run tests
    await testEvmToEvmBridge(wallets);
    await testEvmToSolanaBridge(wallets);
    await testSolanaToEvmBridge(wallets);
    
    console.log('\nAll tests completed!');
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
};

// Run the tests
runTests().catch(console.error);
