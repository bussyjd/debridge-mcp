import { createWalletClient, http, createPublicClient } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { getSupportedChainsHandler } from '../tools/handlers.js';
import { ChainInfo } from '../tools/schemas.js';
import { SUPPORTED_CHAINS } from './constants.js';

// Cache for supported chains
let cachedChains: ChainInfo[] | null = null;

/**
 * Fetches the supported chains from the API or returns the cached result
 * @returns A promise that resolves to the list of supported chains
 */
export async function getSupportedChains(): Promise<ChainInfo[]> {
  if (cachedChains) {
    return cachedChains;
  }

  try {
    const response = await getSupportedChainsHandler();
    cachedChains = response.chains;
    return response.chains;
  } catch (error) {
    console.error("Error fetching supported chains, falling back to static list:", error);
    // Fallback to static list if API call fails
    const fallbackChains = Object.values(SUPPORTED_CHAINS).map(chain => ({
      chainId: String(chain.chainId),
      originalChainId: String(chain.chainId),
      chainName: chain.name || chain.chainName,
      nativeToken: {
        symbol: chain.nativeCurrency.symbol,
        name: chain.nativeCurrency.name,
        decimals: chain.nativeCurrency.decimals
      },
      rpcUrl: chain.rpcUrls?.default?.http[0] || ''
    }));
    return fallbackChains;
  }
}

/**
 * Gets chain configuration for a specific chain ID
 * @param chainId The chain ID to get configuration for
 * @returns A promise that resolves to the chain configuration
 */
export async function getChainConfig(chainId: string): Promise<ChainInfo | undefined> {
  const chains = await getSupportedChains();
  return chains.find(chain => chain.chainId === chainId);
}

/**
 * Determines if an address is a Solana address
 * @param address The address to check
 * @returns True if the address is a Solana address, false otherwise
 */
export function isSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Determines the chain type from an address
 * @param address The address to check
 * @returns 'solana' if the address is a Solana address, 'evm' otherwise
 */
export function getChainTypeFromAddress(address: string): 'solana' | 'evm' {
  return isSolanaAddress(address) ? 'solana' : 'evm';
}

// Type definitions
export type ChainType = 'evm' | 'solana';

export interface WalletProvider {
  getAddress(): Promise<string>;
  sendTransaction(params: any): Promise<string>;
  isSolana: boolean;
}

/**
 * Creates a wallet provider for a specific chain
 * @param seedPhrase The seed phrase to derive the wallet from
 * @param chainId The chain ID to create the wallet for
 * @returns A promise that resolves to the wallet provider
 */
export async function createWalletProvider(seedPhrase: string, chainId: string): Promise<WalletProvider> {
  const chainConfig = await getChainConfig(chainId);
  
  if (!chainConfig) {
    throw new Error(`Chain ID ${chainId} not supported`);
  }
  
  // For Solana chains
  if (chainId === '7565164') {
    const seed = await bip39.mnemonicToSeed(seedPhrase);
    const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.slice(0, 32)).key;
    const keypair = Keypair.fromSeed(derivedSeed);
    
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
        const connection = new Connection(chainConfig.rpcUrl || 'https://api.mainnet-beta.solana.com', 'confirmed');
        const signature = await connection.sendRawTransaction(transaction.serialize());
        
        // Confirm the transaction
        await connection.confirmTransaction({
          signature,
          lastValidBlockHeight: 0,
          blockhash: transaction.recentBlockhash || '',
        });
        
        return signature;
      },
      isSolana: true
    };
  }
  
  // For EVM chains
  const account = mnemonicToAccount(seedPhrase);
  
  const walletClient = createWalletClient({
    account,
    chain: {
      id: Number(chainConfig.originalChainId),
      name: chainConfig.chainName,
      nativeCurrency: chainConfig.nativeToken || {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrls: {
        default: { http: [chainConfig.rpcUrl || ''] }
      }
    },
    transport: http()
  });
  
  const publicClient = createPublicClient({
    chain: {
      id: Number(chainConfig.originalChainId),
      name: chainConfig.chainName,
      nativeCurrency: chainConfig.nativeToken || {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrls: {
        default: { http: [chainConfig.rpcUrl || ''] }
      }
    },
    transport: http()
  });
  
  return {
    getAddress: async () => account.address,
    sendTransaction: async (params: any) => {
      // For EVM chains, we expect the transaction data to be in the params
      const hash = await walletClient.sendTransaction({
        to: params.to,
        value: params.value ? BigInt(params.value) : undefined,
        data: params.data,
        gas: params.gas ? BigInt(params.gas) : undefined,
        gasPrice: params.gasPrice ? BigInt(params.gasPrice) : undefined,
      });
      
      return hash;
    },
    isSolana: false
  };
}
