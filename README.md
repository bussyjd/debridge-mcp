# DeBridge MCP Server

A minimal Model Context Protocol (MCP) server for interacting with the DeBridge protocol, enabling cross-chain token bridging operations.

## Features

- **Dynamic Chain List**: Automatically fetches supported chains from the DLN API
- **Multi-Chain Support**: Handles both EVM and Solana transactions seamlessly
- **Token Search**: Search for tokens on any supported blockchain
- **Bridge Quotes**: Get quotes for cross-chain token transfers
- **Order Creation**: Create bridge orders for transferring tokens between chains
- **Transaction Execution**: Execute bridge transactions with proper wallet signing

## Tools

The DeBridge MCP server provides the following tools:

1. `get_supported_chains`: Get a list of all supported chains with their details
2. `search_token`: Search for tokens on a specific chain
3. `get_bridge_quote`: Get a quote for bridging tokens between chains
4. `create_bridge_order`: Create a bridge order for cross-chain token transfers
5. `execute_bridge_transaction`: Execute a bridge transaction on any supported chain

## Setup

### Prerequisites

- Node.js v18+
- pnpm
- A mnemonic phrase for transaction signing

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/debridge-mcp.git
   cd debridge-mcp
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file in the root directory:
   ```
   SEED_PHRASE="your twelve word mnemonic phrase here"
   ```

### Building

Build the TypeScript code:
```bash
pnpm run build
```

### Running

Start the MCP server:
```bash
pnpm start
```

## Usage Examples

### Get Supported Chains

```json
{
  "name": "get_supported_chains",
  "arguments": {}
}
```

### Search for Tokens

```json
{
  "name": "search_token",
  "arguments": {
    "chainId": "1",
    "search": "USDC"
  }
}
```

### Get a Bridge Quote

```json
{
  "name": "get_bridge_quote",
  "arguments": {
    "srcChainId": "1",
    "srcChainTokenIn": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "srcChainTokenInAmount": "1000000",
    "dstChainId": "56",
    "dstChainTokenOut": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
  }
}
```

### Create a Bridge Order

```json
{
  "name": "create_bridge_order",
  "arguments": {
    "srcChainId": "1",
    "srcChainTokenIn": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "srcChainTokenInAmount": "1000000",
    "dstChainId": "56",
    "dstChainTokenOut": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    "dstChainTokenOutRecipient": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "senderAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  }
}
```

### Execute a Bridge Transaction

```json
{
  "name": "execute_bridge_transaction",
  "arguments": {
    "txData": {
      "to": "0x663F3ad617193148711d28f5334eE4Ed07016602",
      "data": "0x095ea7b3000000000000000000000000663f3ad617193148711d28f5334ee4ed07016602000000000000000000000000000000000000000000000000000000000000000a",
      "value": "0"
    }
  }
}
```

## Supported Chains

- Ethereum (1)
- Optimism (10)
- BNB Chain (56)
- Polygon (137)
- Base (8453)
- Arbitrum One (42161)
- Avalanche (43114)
- Linea (59144)
- Solana (7565164)
- And more...

## License

MIT
