'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ApiService } from '@/lib/api';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Required - identifies what we're chatting about
  chatType: string;
  
  // Context parameters - each parent passes what it has
  insightsId?: number | string;
  recommendationId?: number | string;
  teamName?: string;
  piName?: string;
  username?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatModal({
  isOpen,
  onClose,
  chatType,
  insightsId,
  recommendationId,
  teamName,
  piName,
  username = 'user',
}: AIChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const [hasInitialMessage, setHasInitialMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiService = useRef(new ApiService());
  // Drag state (desktop only)
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const onHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Enable drag only on non-touch large screens
    if (window.innerWidth < 768) return;
    if (!panelRef.current) return;
    isDraggingRef.current = true;
    // Record offset between pointer and current position
    dragOffsetRef.current = {
      x: e.clientX - dragPos.x,
      y: e.clientY - dragPos.y,
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !panelRef.current) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = panelRef.current.getBoundingClientRect();
    const panelWidth = rect.width;
    const panelHeight = rect.height;

    let nextX = e.clientX - dragOffsetRef.current.x;
    let nextY = e.clientY - dragOffsetRef.current.y;

    // Clamp within viewport (relative to centered origin via transform)
    const maxX = viewportWidth - panelWidth / 2;
    const minX = -maxX;
    const maxY = viewportHeight - panelHeight / 2;
    const minY = -maxY;

    if (nextX > maxX) nextX = maxX;
    if (nextX < minX) nextX = minX;
    if (nextY > maxY) nextY = maxY;
    if (nextY < minY) nextY = minY;

    setDragPos({ x: nextX, y: nextY });
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;
    window.removeEventListener('mousemove', onMouseMove);
  };

  // Build chat request payload
  const buildChatRequest = (
    question: string,
    convId: string | null
  ) => {
    const request: any = {
      question: question,
      username: username,
      selected_team: teamName || '',
      selected_pi: piName || '',
      chat_type: chatType,
      recommendation_id: recommendationId !== undefined && recommendationId !== null ? String(recommendationId) : '',
      insights_id: insightsId !== undefined && insightsId !== null ? String(insightsId) : '',
    };
    
    // Only include conversation_id if it exists (for follow-up questions)
    if (convId && convId.trim() !== '') {
      request.conversation_id = convId;
    }
    
    return request;
  };

  // Send initial message automatically when modal opens
  const sendInitialMessage = React.useCallback(async () => {
    setHasInitialMessage(true);
    setLoading(true);
    setError(null);
    setConversationId(''); // Ensure conversation ID is empty on first message

    try {
      // Send an empty initial question
      const initialQuestion = "";
      const requestPayload = buildChatRequest(initialQuestion, null); // null for first request
      console.log('AI Chat Request Payload:', requestPayload); // Debug: verify insights id is included
      const response = await apiService.current.chatWithInsight(requestPayload);

      if (response.success && response.data) {
        // Extract conversation ID from canonical path
        const convId = response.data.conversation_id || '';
        if (convId) {
          setConversationId(convId);
        }

        // Add AI response to chat
        const aiMessage: Message = {
          role: 'assistant',
          content: response.data.response || 'No response received.',
        };
        setMessages([aiMessage]);
      } else {
        throw new Error(response.message || 'Failed to get AI response');
      }
    } catch (err) {
      console.error('Error sending initial chat message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      setError(errorMessage);
      
      // Add error message to chat
      const errorMsg: Message = {
        role: 'assistant',
        content: `Error: ${errorMessage}`,
      };
      setMessages([errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [chatType, insightsId, recommendationId, teamName, piName, username]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInputValue('');
      setLoading(false);
      setError(null);
      setConversationId('');
      setHasInitialMessage(false);
    }
  }, [isOpen]);

  // Send initial message when modal opens
  useEffect(() => {
    if (isOpen && !hasInitialMessage) {
      sendInitialMessage();
    }
  }, [isOpen, hasInitialMessage, sendInitialMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Handle sending a message
  const handleSend = async () => {
    const question = inputValue.trim();
    if (!question || loading) return;

    // Add user message to chat
    const userMessage: Message = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError(null);

    try {
      const requestPayload = buildChatRequest(question, conversationId);
      const response = await apiService.current.chatWithInsight(requestPayload);

      if (response.success && response.data) {
        // Extract conversation ID from canonical path
        const convId = response.data.conversation_id || '';
        if (convId) {
          setConversationId(convId);
        }

        // Add AI response to chat
        const aiMessage: Message = {
          role: 'assistant',
          content: response.data.response || 'No response received.',
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(response.message || 'Failed to get AI response');
      }
    } catch (err) {
      console.error('Error sending chat message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      setError(errorMessage);
      
      // Add error message to chat
      const errorMsg: Message = {
        role: 'assistant',
        content: `Error: ${errorMessage}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key (Shift+Enter for new line, Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={panelRef}
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col"
        style={{ transform: `translate(${dragPos.x}px, ${dragPos.y}px)` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b border-gray-200 select-none md:cursor-move bg-gray-100 text-gray-900 rounded-t-lg"
          onMouseDown={onHeaderMouseDown}
        >
          <h3 className="text-sm font-semibold">AI Chat</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[400px] space-y-4">
          {messages.length === 0 && !loading && !hasInitialMessage && (
            <div className="text-center text-gray-500 text-sm mt-8">
              Loading...
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside text-sm mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside text-sm mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-sm">{children}</li>,
                      code: ({ children }) => (
                        <code className="bg-gray-200 px-1 rounded text-sm font-mono">{children}</code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-gray-200 p-2 rounded text-sm overflow-x-auto mb-2">{children}</pre>
                      ),
                      h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-gray-300 pl-2 italic text-sm mb-2">{children}</blockquote>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-center text-gray-500 text-sm italic">
              Sending your request to the LLM
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-end space-x-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question here... (Press Enter to send, Shift+Enter for new line)"
              rows={3}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
