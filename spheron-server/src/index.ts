#!/usr/bin/env node

/**
 * Node.js version check
 */
const requiredNodeVersion = '16.0.0';
const currentNodeVersion = process.versions.node;

function compareVersions(v1: string, v2: string): number {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

if (compareVersions(currentNodeVersion, requiredNodeVersion) < 0) {
  console.error(`Error: This application requires Node.js ${requiredNodeVersion} or higher.`);
  console.error(`You are currently running Node.js ${currentNodeVersion}.`);
  console.error('Please upgrade your Node.js version or use nvm to manage multiple Node.js versions.');
  process.exit(1);
}

/**
 * Spheron Protocol MCP Server
 * 
 * This MCP server integrates with the Spheron Protocol SDK to provide:
 * - Deployment of compute resources
 * - Fetching wallet balances
 * - Fetching deployment URLs
 * - Fetching lease IDs
 * - Deploying custom YAML files
 * - Converting natural language to YAML
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { SpheronSDK } from "@spheron/protocol-sdk";
import pkg from 'fs-extra';
const { readFile } = pkg;
import * as path from 'path';

// Import logger
import logger from './utils/logger.js';

// Import natural language processor
import { processDescription, generateQuestion, ExtractedParams } from './natural-language-processor/index.js';

// Import YAML generator
import { generateYamlFromParams, validateYamlConfig, updateYamlConfig } from './yaml-generator/index.js';

// Import conversation manager
import { 
  createConversation, 
  getConversation, 
  updateConversation, 
  completeConversation,
  ConversationState
} from './conversation/index.js';

// Environment variables for Spheron SDK
const SPHERON_PRIVATE_KEY = process.env.SPHERON_PRIVATE_KEY;
const SPHERON_NETWORK = process.env.SPHERON_NETWORK || "testnet";
const DEFAULT_PROVIDER_PROXY_URL = process.env.PROVIDER_PROXY_URL || "https://provider-proxy.spheron.network";
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Log environment configuration (without sensitive data)
logger.info('Setup', `Starting Spheron MCP server with network: ${SPHERON_NETWORK}`);
logger.info('Setup', `Provider proxy URL: ${DEFAULT_PROVIDER_PROXY_URL}`);
logger.info('Setup', `Claude API available: ${Boolean(CLAUDE_API_KEY)}`);

// Token requirements for deployment
const DEFAULT_CST_RATE_PER_HOUR = 3; // Default rate of 3 CST per hour
const MINIMUM_CST_BALANCE = DEFAULT_CST_RATE_PER_HOUR; // Minimum balance required for deployment (1 hour)
const RECOMMENDED_CST_BALANCE = DEFAULT_CST_RATE_PER_HOUR * 24; // Recommended balance (24 hours)
const WARNING_CST_THRESHOLD = DEFAULT_CST_RATE_PER_HOUR * 2; // Warning threshold (2 hours)

/**
 * Helper function to format token amounts based on their decimal places
 * @param amount The raw token amount (can be string, number, or bigint)
 * @param decimals The number of decimal places for the token (default: 6 for CST)
 * @returns Formatted token amount as a string
 */
function formatTokenAmount(amount: string | number | bigint, decimals: number = 6): string {
  const amountStr = amount.toString();
  const amountNum = parseFloat(amountStr) / Math.pow(10, decimals);
  return amountNum.toString();
}

/**
 * Helper function to get token decimals based on token symbol
 * @param token The token symbol (e.g., 'CST', 'USDC')
 * @returns The number of decimal places for the token
 */
function getTokenDecimals(token: string): number {
  // Token decimal mapping (add more as needed)
  const tokenDecimals: Record<string, number> = {
    'CST': 6,
    'USDC': 6,
    'ETH': 18,
    'MATIC': 18
  };
  
  return tokenDecimals[token.toUpperCase()] || 6; // Default to 6 if unknown
}

/**
 * Helper function to check if user has sufficient balance for deployment
 * @param token The token symbol (e.g., 'CST')
 * @param walletAddress Optional wallet address (defaults to authenticated wallet)
 * @returns Object containing balance check result and formatted balance information
 */
async function checkSufficientBalance(token: string = 'CST', walletAddress?: string): Promise<{
  sufficient: boolean;
  balance: any;
  formattedBalance: any;
  minimumRequired: number;
  recommendedBalance: number;
  warningThreshold: number;
  message: string;
}> {
  logger.info('API', `Checking ${token} balance for deployment`);
  
  // Fetch user balance
  const balance = await spheronSDK.escrow.getUserBalance(token, walletAddress);
  
  // Handle BigInt serialization
  const safeBalance = JSON.parse(JSON.stringify(balance, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  ));
  
  // Get token decimals
  const decimals = getTokenDecimals(token);
  
  // Format balance values
  const formattedBalance = {
    lockedBalance: {
      raw: safeBalance.lockedBalance,
      formatted: formatTokenAmount(safeBalance.lockedBalance, decimals)
    },
    unlockedBalance: {
      raw: safeBalance.unlockedBalance,
      formatted: formatTokenAmount(safeBalance.unlockedBalance, decimals)
    },
    token: safeBalance.token,
    decimals: decimals
  };
  
  // Convert to number for comparison
  const unlockedBalanceNum = parseFloat(formattedBalance.unlockedBalance.formatted);
  
  // Check if balance is sufficient
  const sufficient = unlockedBalanceNum >= MINIMUM_CST_BALANCE;
  
  // Create appropriate message
  let message = '';
  if (sufficient) {
    if (unlockedBalanceNum < WARNING_CST_THRESHOLD) {
      message = `Warning: Your balance of ${unlockedBalanceNum} ${token} is sufficient for deployment but may run out quickly. We recommend at least ${RECOMMENDED_CST_BALANCE} ${token} for 24 hours of operation.`;
    } else if (unlockedBalanceNum < RECOMMENDED_CST_BALANCE) {
      message = `Your balance of ${unlockedBalanceNum} ${token} is sufficient for deployment. For longer operation, we recommend at least ${RECOMMENDED_CST_BALANCE} ${token} (24 hours of operation).`;
    } else {
      message = `Your balance of ${unlockedBalanceNum} ${token} is sufficient for deployment.`;
    }
  } else {
    message = `Insufficient balance: You have ${unlockedBalanceNum} ${token}, but deployment requires at least ${MINIMUM_CST_BALANCE} ${token}.`;
  }
  
  return {
    sufficient,
    balance: safeBalance,
    formattedBalance,
    minimumRequired: MINIMUM_CST_BALANCE,
    recommendedBalance: RECOMMENDED_CST_BALANCE,
    warningThreshold: WARNING_CST_THRESHOLD,
    message
  };
}

// Initialize Spheron SDK
let spheronSDK: SpheronSDK;

try {
  if (!SPHERON_PRIVATE_KEY) {
    throw new Error("SPHERON_PRIVATE_KEY environment variable is required");
  }
  
  logger.info('Setup', 'Initializing Spheron SDK...');
  spheronSDK = new SpheronSDK(SPHERON_NETWORK as any, SPHERON_PRIVATE_KEY);
  logger.info('Setup', 'Spheron SDK initialized successfully');
} catch (error) {
  logger.error('Setup', 'Failed to initialize Spheron SDK', error);
  process.exit(1);
}

/**
 * Create an MCP server with capabilities for tools to interact with Spheron Protocol
 */
const server = new Server(
  {
    name: "Spheron-MCP",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handler that lists available tools.
 * Exposes a single "spheron_operation" tool that lets clients interact with Spheron Protocol.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "spheron_operation",
        description: "Perform operations with Spheron Protocol",
        inputSchema: {
          type: "object",
          properties: {
            operation: {
              type: "string",
              enum: ["deploy_compute", "fetch_balance", "fetch_deployment_urls", "fetch_lease_id", "deploy_yaml", "natural_to_yaml"],
              description: "The operation to perform"
            },
            yaml_content: {
              type: "string",
              description: "YAML content for deployment (for deploy operations)"
            },
            yaml_path: {
              type: "string",
              description: "Path to YAML file (alternative to yaml_content)"
            },
            token: {
              type: "string",
              description: "Token symbol (e.g., 'CST', 'USDC') for balance operations and deployments (defaults to 'CST')"
            },
            wallet_address: {
              type: "string",
              description: "Wallet address to check (defaults to authenticated wallet)"
            },
            lease_id: {
              type: "string",
              description: "ID of the lease/deployment"
            },
            provider_proxy_url: {
              type: "string",
              description: "URL for the provider proxy server (defaults to environment variable)"
            },
            description: {
              type: "string",
              description: "Natural language description of compute requirements (for natural_to_yaml operation)"
            },
            conversation_id: {
              type: "string",
              description: "Conversation ID for multi-turn conversations (for natural_to_yaml operation)"
            },
            answer: {
              type: "string",
              description: "Answer to a follow-up question (for natural_to_yaml operation)"
            },
            existing_yaml: {
              type: "string",
              description: "Existing YAML to update (for natural_to_yaml operation)"
            }
          },
          required: ["operation"]
        }
      }
    ]
  };
});

/**
 * Handler for the spheron_operation tool.
 * Routes to different operations based on the operation parameter.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "spheron_operation") {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${request.params.name}`
    );
  }

  const args = request.params.arguments || {};
  const operation = args.operation as string;
  const providerProxyUrl = args.provider_proxy_url as string || DEFAULT_PROVIDER_PROXY_URL;

  try {
    logger.info('API', `Executing operation: ${operation}`);
    
    switch (operation) {
      case "deploy_compute":
      case "deploy_yaml": {
        // Get YAML content either directly or from file
        let yamlContent: string;
        
        if (args.yaml_content) {
          yamlContent = args.yaml_content as string;
        } else if (args.yaml_path) {
          const yamlPath = args.yaml_path as string;
          try {
            yamlContent = await readFile(yamlPath, 'utf8');
          } catch (error) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Failed to read YAML file: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        } else {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Either yaml_content or yaml_path must be provided"
          );
        }

        // Check if user has sufficient balance for deployment
        const token = args.token as string || 'CST';
        const walletAddress = args.wallet_address as string;
        const balanceCheck = await checkSufficientBalance(token, walletAddress);
        
        if (!balanceCheck.sufficient) {
          throw new McpError(
            ErrorCode.InvalidParams,
            balanceCheck.message
          );
        }
        
        // If balance is low but sufficient, log a warning
        if (parseFloat(balanceCheck.formattedBalance.unlockedBalance.formatted) < WARNING_CST_THRESHOLD) {
          logger.warn('API', balanceCheck.message);
        }

        logger.info('API', 'Creating deployment with Spheron SDK');
        const deploymentResult = await spheronSDK.deployment.createDeployment(
          yamlContent,
          providerProxyUrl
        );

        // Handle BigInt serialization
        const safeResult = JSON.parse(JSON.stringify(deploymentResult, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        ));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              leaseId: safeResult.leaseId,
              message: `Deployment created successfully with lease ID: ${safeResult.leaseId}`,
              balanceInfo: {
                currentBalance: balanceCheck.formattedBalance.unlockedBalance.formatted,
                token: token,
                minimumRequired: MINIMUM_CST_BALANCE,
                recommendedBalance: RECOMMENDED_CST_BALANCE,
                warning: parseFloat(balanceCheck.formattedBalance.unlockedBalance.formatted) < WARNING_CST_THRESHOLD ? balanceCheck.message : null
              }
            }, null, 2)
          }]
        };
      }

      case "fetch_balance": {
        const token = args.token as string;
        const walletAddress = args.wallet_address as string;
        
        if (!token) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Token symbol is required"
          );
        }

        logger.info('API', `Fetching balance for token: ${token}`);
        const balance = await spheronSDK.escrow.getUserBalance(token, walletAddress);

        // Handle BigInt serialization
        const safeBalance = JSON.parse(JSON.stringify(balance, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        ));

        // Get token decimals
        const decimals = getTokenDecimals(token);

        // Format balance values
        const formattedBalance = {
          lockedBalance: {
            raw: safeBalance.lockedBalance,
            formatted: formatTokenAmount(safeBalance.lockedBalance, decimals)
          },
          unlockedBalance: {
            raw: safeBalance.unlockedBalance,
            formatted: formatTokenAmount(safeBalance.unlockedBalance, decimals)
          },
          token: safeBalance.token,
          decimals: decimals
        };

        // Create a user-friendly response
        const userFriendlyResponse = {
          success: true,
          balance: formattedBalance,
          message: `Here's your current ${token} balance:\nUnlocked Balance: ${formatTokenAmount(safeBalance.unlockedBalance, decimals)} ${token}\nLocked Balance: ${formatTokenAmount(safeBalance.lockedBalance, decimals)} ${token}\nToken: ${token} (${decimals} decimals)`
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(userFriendlyResponse, null, 2)
          }]
        };
      }

      case "fetch_deployment_urls": {
        const leaseId = args.lease_id as string;
        
        if (!leaseId) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Lease ID is required"
          );
        }

        logger.info('API', `Fetching deployment details for lease ID: ${leaseId}`);
        const deploymentDetails = await spheronSDK.deployment.getDeployment(leaseId, providerProxyUrl);

        // Handle BigInt serialization
        const safeDetails = JSON.parse(JSON.stringify(deploymentDetails, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        ));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              deploymentDetails: safeDetails
            }, null, 2)
          }]
        };
      }

      case "fetch_lease_id": {
        const leaseId = args.lease_id as string;
        
        if (!leaseId) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Lease ID is required"
          );
        }

        logger.info('API', `Fetching lease details for lease ID: ${leaseId}`);
        const leaseDetails = await spheronSDK.leases.getLeaseDetails(leaseId);

        // Handle BigInt serialization
        const safeLeaseDetails = JSON.parse(JSON.stringify(leaseDetails, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        ));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              leaseDetails: safeLeaseDetails
            }, null, 2)
          }]
        };
      }

      case "natural_to_yaml": {
        const description = args.description as string;
        const conversationId = args.conversation_id as string;
        const answer = args.answer as string;
        const existingYaml = args.existing_yaml as string;
        
        // Handle multi-turn conversation
        if (conversationId && answer) {
          // Get existing conversation
          const conversation = getConversation(conversationId);
          
          if (!conversation) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Conversation not found: ${conversationId}`
            );
          }
          
          // Process the answer to update parameters
          const combinedDescription = `${conversation.originalDescription} ${answer}`;
          const { params, missingParams } = await processDescription(combinedDescription, CLAUDE_API_KEY);
          
          // Merge with current parameters
          const updatedParams: ExtractedParams = {
            ...conversation.currentParams,
            ...params
          };
          
          // Update conversation state
          const lastQuestion = conversation.history.length > 0 
            ? conversation.history[conversation.history.length - 1].question 
            : '';
          
          const updatedConversation = updateConversation(
            conversationId,
            lastQuestion,
            answer,
            updatedParams,
            missingParams
          );
          
          if (missingParams.length > 0) {
            // Generate follow-up question
            const question = await generateQuestion(missingParams, combinedDescription, CLAUDE_API_KEY);
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: true,
                  conversation_id: conversationId,
                  complete: false,
                  question,
                  missing_params: missingParams
                }, null, 2)
              }]
            };
          } else {
            // Generate YAML
            let yamlContent: string;
            
            if (existingYaml) {
              yamlContent = updateYamlConfig(existingYaml, updatedParams);
            } else {
              yamlContent = generateYamlFromParams(updatedParams);
            }
            
            // Validate YAML
            const validation = validateYamlConfig(yamlContent);
            
            // Mark conversation as complete
            completeConversation(conversationId);
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: true,
                  conversation_id: conversationId,
                  complete: true,
                  yaml: yamlContent,
                  valid: validation.valid,
                  errors: validation.errors
                }, null, 2)
              }]
            };
          }
        } else if (description) {
          // Start a new conversation
          const { params, missingParams } = await processDescription(description, CLAUDE_API_KEY);
          
          // Create conversation state
          const conversation = createConversation(description, params, missingParams);
          
          if (missingParams.length > 0) {
            // Generate follow-up question
            const question = await generateQuestion(missingParams, description, CLAUDE_API_KEY);
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: true,
                  conversation_id: conversation.id,
                  complete: false,
                  question,
                  missing_params: missingParams
                }, null, 2)
              }]
            };
          } else {
            // Generate YAML
            let yamlContent: string;
            
            if (existingYaml) {
              yamlContent = updateYamlConfig(existingYaml, params);
            } else {
              yamlContent = generateYamlFromParams(params);
            }
            
            // Validate YAML
            const validation = validateYamlConfig(yamlContent);
            
            // Mark conversation as complete
            completeConversation(conversation.id);
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: true,
                  conversation_id: conversation.id,
                  complete: true,
                  yaml: yamlContent,
                  valid: validation.valid,
                  errors: validation.errors
                }, null, 2)
              }]
            };
          }
        } else {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Either description or conversation_id and answer must be provided"
          );
        }
      }
      
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown operation: ${operation}`
        );
    }
  } catch (error) {
    logger.error('API', 'Operation failed', error);
    
    // Ensure error is properly serialized
    let errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a BigInt serialization error and provide a more helpful message
    if (errorMessage.includes("BigInt") && errorMessage.includes("serialize")) {
      errorMessage = "BigInt serialization error in response data. This has been fixed in the latest version.";
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: false,
          error: errorMessage
        }, null, 2)
      }],
      isError: true
    };
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  logger.info('Setup', 'Starting Spheron MCP server...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Setup', 'Spheron MCP server running on stdio');
}

main().catch((error) => {
  logger.error('Server', 'Server error', error);
  process.exit(1);
});
