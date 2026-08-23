import api, { AI_TIMEOUT } from './api';
import { ENDPOINTS } from '@/constants/endpoints';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChatMode = 'ADJUST_PLAN' | 'DATA_QUERY';

export interface AiChatRequest {
  message: string;
  conversationId?: string | null;
  domainId: string;
  chatMode: ChatMode;
}

export interface AiActionResponse {
  type: string;
  description: string;
  payload: Record<string, any>;
}

export interface AiChatResponse {
  reply: string;
  conversationId: string;
  proposedActions: AiActionResponse[];
}

export interface AiMessageResponse {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
}

export interface AiConversationResponse {
  id: string;
  preview: string;
  updatedAt: string;
}

export interface RemainingResponse {
  remaining: number;
}

// ─── API Calls ───────────────────────────────────────────────────────────────

/**
 * Send a chat message to the AI. Requires domainId and chatMode.
 */
export async function sendChatMessage(request: AiChatRequest): Promise<AiChatResponse> {
  const response = await api.post<AiChatResponse>(ENDPOINTS.AI.CHAT, request, AI_TIMEOUT);
  return response.data;
}

/**
 * Get remaining AI messages for today.
 */
export async function getRemainingMessages(): Promise<number> {
  const response = await api.get<RemainingResponse>(ENDPOINTS.AI.REMAINING);
  return response.data.remaining;
}

/**
 * Get conversation history.
 */
export async function getConversations(): Promise<AiConversationResponse[]> {
  const response = await api.get<AiConversationResponse[]>(ENDPOINTS.AI.CONVERSATIONS);
  return response.data;
}

/**
 * Get messages for a conversation.
 */
export async function getMessages(conversationId: string): Promise<AiMessageResponse[]> {
  const response = await api.get<AiMessageResponse[]>(ENDPOINTS.AI.MESSAGES(conversationId));
  return response.data;
}

/**
 * Apply a proposed AI action (user confirmation).
 */
export async function applyAction(actionType: string, payload: Record<string, any>): Promise<void> {
  await api.post(ENDPOINTS.AI.APPLY_ACTION, { actionType, payload });
}
