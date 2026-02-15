import type { ChatMessage } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Send a chat message to the chatbot API
 * Public endpoint — no API key needed
 */
export async function sendChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/chatbot?action=chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history: history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to get response');
  }

  return data.reply;
}
