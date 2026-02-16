/**
 * Chat Widget — Embeddable standalone bundle
 *
 * This file is the entry point for `npm run build:widget`.
 * It produces a single self-executing JS file that can be dropped onto any website.
 *
 * Usage on external site:
 *   <script src="https://your-admin-domain/chat-widget.js"
 *           data-api-url="https://your-admin-domain/api"></script>
 *
 * All styles are inline — no Tailwind or CSS files needed.
 * Reuses chatService.ts and types.ts from the main app.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { setApiBaseUrl, sendChatMessage } from './components/chat/chatService';
import type { ChatMessage } from './components/chat/types';

// ============================================
// SVG Icons (inline, no external deps)
// ============================================

function ChatIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ============================================
// Styles (all inline — no Tailwind needed)
// ============================================

const BRAND = '#673de6';
const BRAND_HOVER = '#5931c7';

const styles = {
  // Floating button
  fab: {
    position: 'fixed' as const,
    bottom: '16px',
    right: '16px',
    zIndex: 99999,
    width: '56px',
    height: '56px',
    backgroundColor: BRAND,
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s, box-shadow 0.2s',
  },
  // Chat panel — desktop (overridden for mobile in component)
  panel: {
    position: 'fixed' as const,
    bottom: '80px',
    right: '16px',
    zIndex: 99999,
    width: 'min(384px, calc(100vw - 32px))',
    height: 'min(500px, 70vh)',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  // Chat panel — mobile fullscreen
  panelMobile: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 0,
    boxShadow: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    border: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  // Header
  header: {
    backgroundColor: BRAND,
    color: '#fff',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerText: {
    fontWeight: 600,
    fontSize: '14px',
    margin: 0,
  },
  headerClose: {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  // Messages area
  messages: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  msgRow: (isUser: boolean) => ({
    display: 'flex',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
  }),
  msgBubble: (isUser: boolean) => ({
    maxWidth: '80%',
    padding: '8px 12px',
    borderRadius: '16px',
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    ...(isUser
      ? { backgroundColor: BRAND, color: '#fff', borderBottomRightRadius: '4px' }
      : { backgroundColor: '#f3f4f6', color: '#1f2937', borderBottomLeftRadius: '4px' }),
  }),
  // Loading dots
  loadingDots: {
    display: 'flex',
    gap: '4px',
    padding: '4px 0',
  },
  dot: (delay: number) => ({
    width: '8px',
    height: '8px',
    backgroundColor: '#9ca3af',
    borderRadius: '50%',
    animation: 'ycw-bounce 1.4s infinite ease-in-out',
    animationDelay: `${delay}ms`,
  }),
  // Input area
  inputArea: {
    borderTop: '1px solid #e5e7eb',
    padding: '12px',
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: '8px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '24px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: '36px',
    height: '36px',
    backgroundColor: BRAND,
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background-color 0.2s, opacity 0.2s',
  },
};

// ============================================
// Keyframe animation (injected once)
// ============================================

function injectKeyframes() {
  if (document.getElementById('ycw-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'ycw-keyframes';
  style.textContent = `
    @keyframes ycw-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// ============================================
// Chat Widget Component
// ============================================

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Namaste! I'm the RituYog assistant. I can help you with session timings, pricing, booking a free trial, and more. How can I help you today?",
  timestamp: Date.now(),
};

const MAX_HISTORY = 20;

const MOBILE_BREAKPOINT = 640;

function EmbedChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    injectKeyframes();
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const loadingMsg: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isLoading: true,
    };

    setInput('');
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsSending(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => !m.isLoading && m.id !== 'welcome')
        .slice(-MAX_HISTORY);

      const reply = await sendChatMessage(trimmed, history);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => prev.map((m) => (m.isLoading ? botMsg : m)));
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I couldn't process your request. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => prev.map((m) => (m.isLoading ? errorMsg : m)));
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, isSending, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div style={isMobile ? styles.panelMobile : styles.panel}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTitle}>
              <ChatIcon size={20} />
              <span style={styles.headerText}>RituYog Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={styles.headerClose}
              aria-label="Close chat"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={styles.messages}>
            {messages.map((msg) => (
              <div key={msg.id} style={styles.msgRow(msg.role === 'user')}>
                <div style={styles.msgBubble(msg.role === 'user')}>
                  {msg.isLoading ? (
                    <div style={styles.loadingDots}>
                      <span style={styles.dot(0)} />
                      <span style={styles.dot(150)} />
                      <span style={styles.dot(300)} />
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={styles.inputArea}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              maxLength={500}
              disabled={isSending}
              style={{
                ...styles.input,
                opacity: isSending ? 0.5 : 1,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = BRAND;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${BRAND}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              style={{
                ...styles.sendBtn,
                opacity: !input.trim() || isSending ? 0.5 : 1,
                cursor: !input.trim() || isSending ? 'not-allowed' : 'pointer',
              }}
              aria-label="Send message"
              onMouseEnter={(e) => {
                if (input.trim() && !isSending)
                  e.currentTarget.style.backgroundColor = BRAND_HOVER;
              }}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND)}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {/* Floating button — hidden on mobile when panel is fullscreen */}
      {!(isMobile && isOpen) && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={styles.fab}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = BRAND_HOVER;
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BRAND;
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
          }}
        >
          {isOpen ? <CloseIcon /> : <ChatIcon />}
        </button>
      )}
    </>
  );
}

// ============================================
// Auto-mount: find the script tag, read config, render
// ============================================

(function mount() {
  // Find our script tag to read data-api-url
  const scripts = document.querySelectorAll('script[data-api-url]');
  const scriptTag = scripts[scripts.length - 1]; // last one wins
  const apiUrl = scriptTag?.getAttribute('data-api-url') || '/api';

  setApiBaseUrl(apiUrl);

  // Create mount point
  const container = document.createElement('div');
  container.id = 'yoga-chat-widget-root';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<EmbedChatWidget />);
})();
