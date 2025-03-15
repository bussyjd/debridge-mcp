/**
 * DeBridge MCP Server
 * A minimal Model Context Protocol server for interacting with the DeBridge protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { version } from "./version.js";
import * as dotenv from "dotenv";
import { createWalletClient, http, publicActions } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { debridgeMcpTools, toolToHandler } from "./tools/index.js";

/**
 * Main function to set up and run the MCP server
 */
async function main() {
  // Load environment variables
  dotenv.config();
  const seedPhrase = process.env.SEED_PHRASE;

  if (!seedPhrase) {
    console.error("Please set SEED_PHRASE environment variable");
    process.exit(1);
  }

  // Create wallet client for transaction signing
  const walletClient = createWalletClient({
    account: mnemonicToAccount(seedPhrase),
    chain: mainnet,
    transport: http(),
  }).extend(publicActions);

  // Initialize MCP server
  const server = new Server(
    {
      name: "DeBridge MCP Server",
      version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Set up request handler for listing tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Received ListToolsRequest");
    return {
      tools: debridgeMcpTools,
    };
  });

  // Set up request handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    try {
      const toolName = request.params.name;
      const handler = toolToHandler[toolName];
      
      if (!handler) {
        throw new Error(`Tool ${toolName} not found`);
      }

      console.error(`Calling tool: ${toolName}`);
      const result = await handler(walletClient, request.params.arguments);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      console.error(`Tool execution error:`, error);
      throw new Error(`Tool ${request.params.name} failed: ${error}`);
    }
  });

  // Connect server to transport
  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);
  console.error("DeBridge MCP Server running on stdio");
}

// Run the server
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
