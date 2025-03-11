/**
 * Conversation state manager for tracking multi-turn conversations
 */

import { ExtractedParams } from '../natural-language-processor/index.js';

/**
 * Conversation state
 */
export interface ConversationState {
  id: string;
  originalDescription: string;
  currentParams: ExtractedParams;
  missingParams: string[];
  history: {
    question: string;
    answer: string;
  }[];
  complete: boolean;
}

// In-memory store for conversation states
const conversationStore = new Map<string, ConversationState>();

/**
 * Create a new conversation
 * @param description Original natural language description
 * @param params Initial extracted parameters
 * @param missingParams Missing parameters
 * @returns Conversation state
 */
export function createConversation(
  description: string,
  params: ExtractedParams,
  missingParams: string[]
): ConversationState {
  // Generate a unique ID
  const id = generateId();
  
  // Create conversation state
  const state: ConversationState = {
    id,
    originalDescription: description,
    currentParams: params,
    missingParams,
    history: [],
    complete: missingParams.length === 0
  };
  
  // Store conversation state
  conversationStore.set(id, state);
  
  return state;
}

/**
 * Get conversation state by ID
 * @param id Conversation ID
 * @returns Conversation state or undefined if not found
 */
export function getConversation(id: string): ConversationState | undefined {
  return conversationStore.get(id);
}

/**
 * Update conversation state
 * @param id Conversation ID
 * @param question Question asked
 * @param answer User's answer
 * @param updatedParams Updated parameters
 * @param missingParams Remaining missing parameters
 * @returns Updated conversation state or undefined if not found
 */
export function updateConversation(
  id: string,
  question: string,
  answer: string,
  updatedParams: ExtractedParams,
  missingParams: string[]
): ConversationState | undefined {
  const state = conversationStore.get(id);
  
  if (!state) {
    return undefined;
  }
  
  // Update conversation state
  state.currentParams = updatedParams;
  state.missingParams = missingParams;
  state.history.push({ question, answer });
  state.complete = missingParams.length === 0;
  
  // Store updated state
  conversationStore.set(id, state);
  
  return state;
}

/**
 * Mark conversation as complete
 * @param id Conversation ID
 * @returns Updated conversation state or undefined if not found
 */
export function completeConversation(id: string): ConversationState | undefined {
  const state = conversationStore.get(id);
  
  if (!state) {
    return undefined;
  }
  
  // Mark as complete
  state.complete = true;
  
  // Store updated state
  conversationStore.set(id, state);
  
  return state;
}

/**
 * Delete conversation
 * @param id Conversation ID
 * @returns True if deleted, false if not found
 */
export function deleteConversation(id: string): boolean {
  return conversationStore.delete(id);
}

/**
 * Generate a unique ID
 * @returns Unique ID
 */
function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Build context from conversation history
 * @param state Conversation state
 * @returns Context string
 */
export function buildContext(state: ConversationState): string {
  let context = `Original description: "${state.originalDescription}"\n\n`;
  
  if (state.history.length > 0) {
    context += 'Conversation history:\n';
    
    for (const { question, answer } of state.history) {
      context += `Q: ${question}\nA: ${answer}\n\n`;
    }
  }
  
  return context;
}
