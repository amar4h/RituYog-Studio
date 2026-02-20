import type { ChatMessage } from './types';

/** Overridable API base URL — set by embed script, falls back to Vite env or /api */
let _apiBaseUrl: string | null = null;

export function setApiBaseUrl(url: string): void {
  _apiBaseUrl = url.replace(/\/+$/, ''); // strip trailing slashes
}

function getApiBaseUrl(): string {
  if (_apiBaseUrl) return _apiBaseUrl;
  // import.meta.env only exists in Vite builds, not library/IIFE builds
  try { return (import.meta as any).env?.VITE_API_URL || '/api'; } catch { return '/api'; }
}

/**
 * Send a chat message to the chatbot API
 * Public endpoint by default — pass adminApiKey to unlock admin tools (e.g. add_asana)
 */
export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  adminApiKey?: string
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (adminApiKey) {
    headers['X-API-Key'] = adminApiKey;
  }

  const response = await fetch(`${getApiBaseUrl()}/chatbot?action=chat`, {
    method: 'POST',
    headers,
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
