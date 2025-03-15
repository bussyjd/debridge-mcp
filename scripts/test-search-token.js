#!/usr/bin/env node

/**
 * Test script for DeBridge MCP Server - search_token tool
 * 
 * This script tests the search_token tool by running the server and sending a request to search for tokens.
 * 
 * Usage:
 *   node test-search-token.js [chainId] [search]
 *   
 * Examples:
 *   node test-search-token.js 1 USDT    # Search for USDT on Ethereum
 *   node test-search-token.js 56 BUSD   # Search for BUSD on BSC
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if required environment variables are set
const requiredEnvVars = [
  'SEED_PHRASE'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please make sure these variables are set in your .env file or environment.');
  process.exit(1);
}

// Path to the built MCP server
const serverPath = path.join(__dirname, '..', 'dist', 'index.js');

// Check if the server file exists
if (!fs.existsSync(serverPath)) {
  console.error(`Error: Server file not found at ${serverPath}`);
  console.error('Please make sure you have built the project with "pnpm run build".');
  process.exit(1);
}

// Get chainId and search term from command line arguments or use defaults
const chainId = process.argv[2] || '1';  // Default to Ethereum
const searchTerm = process.argv[3] || 'USDT';  // Default to USDT

console.log(`Starting DeBridge MCP server test for search_token with chainId: ${chainId}, search: ${searchTerm}...`);

// Start the MCP server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env
});

// Buffer to collect stdout data
let stdoutBuffer = '';
let toolCallSent = false;

// Handle server output
server.stderr.on('data', (data) => {
  console.log(`[Server Log] ${data.toString().trim()}`);
});

// Wait for server to start
setTimeout(() => {
  console.log('\nSending test request to list available tools...');
  
  // First, list all available tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  server.stdin.write(`${JSON.stringify(listToolsRequest)}\n`);
}, 2000);

// Listen for responses
server.stdout.on('data', (data) => {
  const chunk = data.toString();
  stdoutBuffer += chunk;
  
  try {
    // Try to parse complete JSON objects from the buffer
    let jsonEndIndex;
    while ((jsonEndIndex = stdoutBuffer.indexOf('}\n')) !== -1) {
      const jsonStr = stdoutBuffer.slice(0, jsonEndIndex + 1);
      stdoutBuffer = stdoutBuffer.slice(jsonEndIndex + 2); // Remove processed JSON
      
      const response = JSON.parse(jsonStr);
      
      if (response.id === 1) {
        // Response for tools/list
        console.log('\nServer response (tools/list):');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.result?.tools) {
          console.log('\n✅ Server is working! Available tools:');
          for (const tool of response.result.tools) {
            console.log(`- ${tool.name}: ${tool.description}`);
          }
          
          if (!toolCallSent) {
            // Now test the search_token tool
            console.log(`\nTesting search_token tool with chainId: ${chainId}, search: ${searchTerm}...`);
            const searchTokenRequest = {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'search_token',
                arguments: {
                  chainId: chainId,
                  search: searchTerm
                }
              }
            };
            
            server.stdin.write(`${JSON.stringify(searchTokenRequest)}\n`);
            toolCallSent = true;
          }
        } else {
          console.log('\n❌ Test failed. Unexpected response from server.');
          server.kill();
          process.exit(1);
        }
      } else if (response.id === 2) {
        // Response for search_token
        console.log('\nServer response (search_token):');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.result) {
          console.log(`\n✅ Successfully searched for tokens with chainId: ${chainId}, search: ${searchTerm}`);
          
          // Display the token results
          const content = response.result.content;
          if (content && content.length > 0) {
            console.log('\nToken search results:');
            for (const item of content) {
              console.log(item.text || item);
            }
          }
        } else if (response.error) {
          console.log(`\n❌ Error searching for tokens: ${response.error.message}`);
        }
        
        // End the test
        console.log('\nTest completed. Shutting down server...');
        server.kill();
        process.exit(0);
      }
    }
  } catch (error) {
    // If we can't parse JSON, it might be streaming output
    if (toolCallSent && !stdoutBuffer.includes('jsonrpc')) {
      console.log('\nStreaming output from search_token:');
      console.log(stdoutBuffer);
      
      // Clear the buffer
      stdoutBuffer = '';
    }
  }
});

// Handle server exit
server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  
  // If we have remaining output, display it
  if (stdoutBuffer.trim()) {
    console.log('\nRemaining output:');
    console.log(stdoutBuffer);
  }
  
  process.exit(code);
});

// Handle errors
server.on('error', (err) => {
  console.error('Failed to start server process:', err);
  process.exit(1);
});

// Set a timeout to kill the server if it runs too long
setTimeout(() => {
  console.log('\nTest timed out after 30 seconds. Shutting down server...');
  server.kill();
  process.exit(1);
}, 30000);
