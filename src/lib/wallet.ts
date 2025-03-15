import { createWalletClient, http, createPublicClient, defineChain } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
// We don't need TOKEN_PROGRAM_ID for the basic implementation
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { SUPPORTED_CHAINS } from './constants.js';

// Type definitions
export type ChainType = 'evm' | 'solana';

export interface WalletProvider {
  getAddress(): Promise<string>;
  sendTransaction(params: any): Promise<string>;
  isSolana: boolean;
}

// Determine if a chain is Solana based on chainId
export function isSolanaChain(chainId: string | number): boolean {
  // Solana mainnet chainId in deBridge API is 7565164
  return chainId === 7565164 || chainId === '7565164';
}

// Determine chain type from address format
export function getChainTypeFromAddress(address: string): ChainType {
  // Solana addresses are 32-44 characters long and base58 encoded
  // They don't start with '0x'
  if (!address.startsWith('0x') && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return 'solana';
  }
  
  // EVM addresses are 42 characters long (including '0x') and hex encoded
  return 'evm';
}

// Create a wallet provider based on chain type
export async function createWalletProvider(
  seedPhrase: string,
  chainId: string | number
): Promise<WalletProvider> {
  if (isSolanaChain(chainId)) {
    return createSolanaWalletProvider(seedPhrase);
  } else {
    return createEvmWalletProvider(seedPhrase, chainId);
  }
}

// Create an EVM wallet provider
function createEvmWalletProvider(
  seedPhrase: string,
  chainId: string | number
): WalletProvider {
  const account = mnemonicToAccount(seedPhrase);
  
  // Find the chain configuration
  const chainConfig = SUPPORTED_CHAINS.find((chain: any) => 
    chain.chainId === Number(chainId) || chain.chainId === chainId
  );
  
  if (!chainConfig) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  // Create a custom chain definition for viem
  const chain = defineChain({
    id: Number(chainConfig.chainId),
    name: chainConfig.chainName || 'Unknown Chain',
    nativeCurrency: {
      name: chainConfig.nativeCurrency?.name || 'Ether',
      symbol: chainConfig.nativeCurrency?.symbol || 'ETH',
      decimals: chainConfig.nativeCurrency?.decimals || 18
    },
    rpcUrls: {
      default: {
        http: [chainConfig.rpcUrl || '']
      }
    }
  });
  
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(chainConfig.rpcUrl || '')
  });
  
  const publicClient = createPublicClient({
    chain,
    transport: http(chainConfig.rpcUrl || '')
  });
  
  return {
    getAddress: async () => account.address,
    sendTransaction: async (params: any) => {
      // Handle EVM transaction
      const hash = await walletClient.sendTransaction({
        to: params.to as `0x${string}`,
        data: params.data as `0x${string}`,
        value: params.value ? BigInt(params.value) : undefined,
      });
      return hash;
    },
    isSolana: false
  };
}

// Create a Solana wallet provider
async function createSolanaWalletProvider(seedPhrase: string): Promise<WalletProvider> {
  // For simplicity in this demo, we'll create a keypair directly from the seed phrase
  // In a production environment, you would use proper HD wallet derivation
  
  // Generate a deterministic seed from the mnemonic
  const seed = await bip39.mnemonicToSeed(seedPhrase);
  
  // Create a hash of the seed to use as the keypair seed
  // This is a simplified approach for the demo
  const seedHash = Array.from(seed).slice(0, 32);
  const keypair = Keypair.fromSeed(Uint8Array.from(seedHash));
  
  // Connect to Solana mainnet
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  return {
    getAddress: async () => keypair.publicKey.toBase58(),
    sendTransaction: async (params: any) => {
      // Handle Solana transaction
      // This is a simplified implementation - in a real-world scenario,
      // you would need to deserialize and handle the transaction based on the specific requirements
      
      // For Solana, we expect the transaction to be serialized in the 'data' field
      if (!params.data) {
        throw new Error('Missing transaction data for Solana transaction');
      }
      
      // Deserialize the transaction
      const serializedTx = Buffer.from(params.data.slice(2), 'hex'); // Remove '0x' prefix
      const transaction = Transaction.from(serializedTx);
      
      // Sign the transaction
      transaction.partialSign(keypair);
      
      // Send the transaction
      const signature = await connection.sendRawTransaction(transaction.serialize());
      
      // Confirm the transaction
      await connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
    },
    isSolana: true
  };
}
