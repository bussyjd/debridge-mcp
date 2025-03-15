# DeBridge MCP Server Development Plan

## Overview

This document outlines the development plan for creating a minimal Model Context Protocol (MCP) server for DeBridge. The server will provide tools for interacting with the DeBridge protocol, enabling cross-chain token bridging operations.

## Requirements

1. Create a minimal MCP server for DeBridge
2. Implement the following tools:
   - `search_token`: Search for tokens on a specific chain
   - `get_bridge_quote`: Get a quote for bridging tokens between chains
   - `create_bridge_order`: Create a bridge order for cross-chain token transfers
   - `execute_bridge_transaction`: Execute a bridge transaction
3. Follow the parameters of `create_bridge_order` from the DeBridge plugin
4. Use Zod for schema validation
5. Reference the base-mcp implementation for structure

## Project Structure

```
debridge-mcp/
├── src/
│   ├── index.ts                  # Main entry point
│   ├── version.ts                # Version information
│   ├── lib/
│   │   └── constants.ts          # Constants and configuration
│   ├── tools/
│   │   ├── index.ts              # Tool definitions and exports
│   │   ├── handlers.ts           # Tool handler implementations
│   │   └── schemas.ts            # Zod schemas for tool parameters
│   └── utils/
│       └── index.ts              # Utility functions
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Project documentation
```

## Implementation Steps

### 1. Project Setup

1. Initialize the project with necessary dependencies:
   - `@modelcontextprotocol/sdk`: For MCP server implementation
   - `zod`: For schema validation
   - `viem`: For blockchain interactions
   - TypeScript and related dev dependencies

### 2. Define Schemas

Create Zod schemas for each tool based on the DeBridge plugin parameters:

1. `search_token_schema`: Parameters for searching tokens on a specific chain
   - `chainId`: Chain ID to search tokens on
   - `search`: Optional search term to filter tokens

2. `get_bridge_quote_schema`: Parameters for getting a bridge quote
   - `srcChainId`: Source chain ID
   - `srcChainTokenIn`: Token address on source chain
   - `srcChainTokenInAmount`: Amount to bridge
   - `dstChainId`: Destination chain ID
   - `dstChainTokenOut`: Token address on destination chain
   - `slippage`: Optional slippage percentage

3. `create_bridge_order_schema`: Parameters for creating a bridge order
   - `srcChainId`: Source chain ID
   - `srcChainTokenIn`: Token address on source chain
   - `srcChainTokenInAmount`: Amount to bridge
   - `dstChainId`: Destination chain ID
   - `dstChainTokenOut`: Token address on destination chain
   - `dstChainTokenOutRecipient`: Recipient address on destination chain
   - `senderAddress`: Sender's address on source chain

4. `execute_bridge_transaction_schema`: Parameters for executing a bridge transaction
   - `txData`: Transaction data from create_bridge_order

### 3. Implement Tool Handlers

Create handler functions for each tool:

1. `searchTokenHandler`: Search for tokens on a specific chain
2. `getBridgeQuoteHandler`: Get a quote for bridging tokens
3. `createBridgeOrderHandler`: Create a bridge order
4. `executeBridgeTransactionHandler`: Execute a bridge transaction

### 4. Set Up MCP Server

1. Configure MCP server with tool definitions and handlers
2. Set up request handlers for listing tools and calling tools
3. Connect server to transport (stdio)
