/**
 * Natural language processor for extracting compute requirements
 */

import { 
  extractFromDescription, 
  identifyMissingParams, 
  mergeWithDefaults,
  ExtractedParams
} from './template-processor.js';
import { 
  enhanceWithClaude, 
  generateFollowUpQuestion 
} from './claude-processor.js';

/**
 * Process natural language description to extract compute requirements
 * @param description Natural language description
 * @param claudeApiKey Claude API key (optional)
 * @returns Extracted parameters and any missing parameters
 */
export async function processDescription(
  description: string,
  claudeApiKey?: string
): Promise<{
  params: ExtractedParams;
  missingParams: string[];
}> {
  // Extract parameters using template-based processor
  let params = extractFromDescription(description);
  
  // Enhance with Claude if API key is provided
  if (claudeApiKey) {
    try {
      params = await enhanceWithClaude(description, params, claudeApiKey);
    } catch (error) {
      console.error('[Error] Failed to enhance with Claude:', error);
    }
  }
  
  // Identify missing parameters
  const missingParams = identifyMissingParams(params);
  
  // Merge with defaults if no missing parameters
  if (missingParams.length === 0) {
    params = mergeWithDefaults(params);
  }
  
  return { params, missingParams };
}

/**
 * Generate a follow-up question for missing parameters
 * @param missingParams Array of missing parameter names
 * @param description Original description
 * @param claudeApiKey Claude API key (optional)
 * @returns Follow-up question
 */
export async function generateQuestion(
  missingParams: string[],
  description: string,
  claudeApiKey?: string
): Promise<string> {
  if (missingParams.length === 0) {
    return '';
  }
  
  if (claudeApiKey) {
    try {
      return await generateFollowUpQuestion(missingParams, description, claudeApiKey);
    } catch (error) {
      console.error('[Error] Failed to generate question with Claude:', error);
    }
  }
  
  // Fallback if Claude API is not available
  return `I need some additional information to complete your deployment. Could you please provide: ${missingParams.join(', ')}?`;
}

export { ExtractedParams };
