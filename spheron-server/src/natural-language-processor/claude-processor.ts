/**
 * Claude API processor for enhancing template-based extraction with LLM capabilities
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { ExtractedParams } from './template-processor.js';
import logger from '../utils/logger.js';

// Claude API client
let anthropic: Anthropic | null = null;

/**
 * Initialize the Claude API client
 * @param apiKey Claude API key
 */
export function initializeClaudeClient(apiKey: string): void {
  anthropic = new Anthropic({
    apiKey
  });
}

/**
 * Get the Claude API client, initializing it if necessary
 * @param apiKey Claude API key
 * @returns Claude API client
 */
export function getClaudeClient(apiKey: string): Anthropic {
  if (!anthropic) {
    initializeClaudeClient(apiKey);
  }
  return anthropic!;
}

/**
 * Enhance extracted parameters using Claude API
 * @param description Natural language description
 * @param extractedParams Parameters extracted by template processor
 * @param apiKey Claude API key
 * @returns Enhanced parameters
 */
export async function enhanceWithClaude(
  description: string,
  extractedParams: ExtractedParams,
  apiKey: string
): Promise<ExtractedParams> {
  const client = getClaudeClient(apiKey);
  
  // Create a prompt for Claude
  const prompt = createPrompt(description, extractedParams);
  
  try {
    // Call Claude API
    const response = await client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      temperature: 0,
      system: "You are a helpful assistant that extracts compute requirements from natural language descriptions and converts them to structured data for Spheron Protocol deployments. You only respond with valid JSON.",
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    // Parse Claude's response
    const content = response.content[0];
    const text = 'text' in content ? content.text : '';
    const enhancedParams = parseClaudeResponse(text, extractedParams);
    return enhancedParams;
  } catch (error) {
    logger.error('Claude', 'Claude API error', error);
    // Return original params if Claude API fails
    return extractedParams;
  }
}

/**
 * Create a prompt for Claude API
 * @param description Natural language description
 * @param extractedParams Parameters extracted by template processor
 * @returns Prompt for Claude API
 */
function createPrompt(description: string, extractedParams: ExtractedParams): string {
  return `
I need you to extract compute requirements from this natural language description and convert them to structured data for a Spheron Protocol deployment.

Description: "${description}"

Here's what I've already extracted:
${JSON.stringify(extractedParams, null, 2)}

Please analyze the description and enhance or correct the extracted parameters. Fill in any missing values with reasonable defaults based on the context.

Important constraints:
1. The token MUST always be "CST" (this is the only valid token)
2. For Jupyter notebook deployments, use image "spheronnetwork/jupyter-notebook:pytorch-2.4.1-cuda-enabled"
3. Default mode should be "provider"
4. Default duration should be "2h"
5. Default region should be "westcoast"
6. Default count should be 1

Return a JSON object with the enhanced parameters. Include all parameters from the original extraction, corrected or enhanced as needed.

Only respond with the JSON object, no other text.
`;
}

/**
 * Parse Claude's response to extract enhanced parameters
 * @param response Claude API response
 * @param originalParams Original extracted parameters
 * @returns Enhanced parameters
 */
function parseClaudeResponse(response: string, originalParams: ExtractedParams): ExtractedParams {
  try {
    // Try to parse JSON from Claude's response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const enhancedParams = JSON.parse(jsonMatch[0]) as ExtractedParams;
      
      // Ensure token is always CST
      if (enhancedParams.amount === undefined) {
        enhancedParams.amount = originalParams.amount || 15;
      }
      
      return enhancedParams;
    }
  } catch (error) {
    logger.error('Claude', 'Failed to parse Claude response', error);
  }
  
  // Return original params if parsing fails
  return originalParams;
}

/**
 * Generate follow-up questions for missing parameters
 * @param missingParams Array of missing parameter names
 * @returns Follow-up question
 */
export async function generateFollowUpQuestion(
  missingParams: string[],
  description: string,
  apiKey: string
): Promise<string> {
  if (missingParams.length === 0) {
    return '';
  }
  
  const client = getClaudeClient(apiKey);
  
  try {
    // Call Claude API
    const response = await client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 300,
      temperature: 0.7,
      system: "You are a helpful assistant that generates follow-up questions to gather missing information for compute deployments.",
      messages: [
        {
          role: 'user',
          content: `
I need to deploy a compute environment based on this description: "${description}"

I'm missing the following information: ${missingParams.join(', ')}

Generate a concise, friendly follow-up question to ask the user for this missing information. Make the question conversational but specific about what's needed.
`
        }
      ]
    });
    
    const content = response.content[0];
    const text = 'text' in content ? content.text : '';
    return text.trim();
  } catch (error) {
    logger.error('Claude', 'Claude API error', error);
    // Return a generic question if Claude API fails
    return `I need some additional information to complete your deployment. Could you please provide: ${missingParams.join(', ')}?`;
  }
}
