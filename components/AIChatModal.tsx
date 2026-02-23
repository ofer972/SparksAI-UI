'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/useSpeechRecognition';
import { useAIChat, Message, DashboardData } from '@/hooks/useAIChat';

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
  /** When true, teamName is a group name (backend resolves to team list for SQL) */
  isGroup?: boolean;
  promptName?: string;
  dashboardData?: DashboardData | null;
}

interface ChatHeaderProps {
  onClose: () => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
  hasInitialMessage: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

interface ChatInputProps {
  inputValue: string;
  loading: boolean;
  isListening: boolean;
  speechError: string | null;
  speechLanguage: SpeechLanguage;
  isSpeechRecognitionSupported: boolean;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onToggleListening: () => void;
  onSpeechErrorDismiss: () => void;
  onSpeechLanguageChange: (lang: SpeechLanguage) => void;
}

// Helper function to detect Hebrew text
const hasHebrewText = (text: string): boolean => {
  if (!text) return false;
  return /[\u0590-\u05FF]/.test(text);
};

const ChatHeader: React.FC<ChatHeaderProps> = ({ onClose, onMouseDown }) => (
  <div
    className="flex items-center justify-between p-4 border-b border-outline select-none bg-surface-secondary text-content-primary"
    onMouseDown={onMouseDown}
  >
    <div className="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM5.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM14.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM10 9a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1z" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0 2a10 10 0 100-20 10 10 0 000 20z" clipRule="evenodd" />
      </svg>
      <h3 className="text-base font-semibold">AI Assistant</h3>
    </div>
    <button
      onClick={onClose}
      className="p-1 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-tertiary transition-colors"
      aria-label="Close"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
);

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  loading,
  hasInitialMessage,
  messagesEndRef,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !loading && !hasInitialMessage && (
        <div className="text-center text-content-tertiary text-sm mt-8">
          Loading...
        </div>
      )}

      {messages.map((message, index) => {
        const isRTL = hasHebrewText(message.content);
        
        return (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-brand text-white'
                  : 'bg-surface-secondary text-content-primary'
              }`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {message.role === 'assistant' ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className={`text-sm mb-2 last:mb-0 ${isRTL ? 'text-right' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => (
                      <ul 
                        className={`list-disc list-inside text-sm mb-2 space-y-1 ${isRTL ? 'text-right' : ''}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      >
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol 
                        className={`list-decimal list-inside text-sm mb-2 space-y-1 ${isRTL ? 'text-right' : ''}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      >
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                        {children}
                      </li>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-200 px-1 rounded text-sm font-mono" dir="ltr">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-gray-200 p-2 rounded text-sm overflow-x-auto mb-2" dir="ltr">
                        {children}
                      </pre>
                    ),
                    h1: ({ children }) => (
                      <h1 className={`text-base font-bold mb-2 ${isRTL ? 'text-right' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className={`text-sm font-bold mb-2 ${isRTL ? 'text-right' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className={`text-sm font-semibold mb-1 ${isRTL ? 'text-right' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        {children}
                      </h3>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote 
                        className={`${isRTL ? 'border-r-2 pr-2' : 'border-l-2 pl-2'} border-outline italic text-sm mb-2`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      >
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => (
                      <a 
                        href={href} 
                        className="text-brand underline hover:text-blue-800" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        dir={isRTL ? 'rtl' : 'ltr'}
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <p className={`text-sm whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                  {message.content}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {loading && (
        <div className="flex justify-center text-content-tertiary text-sm italic">
          Sending your request to the LLM
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  loading,
  isListening,
  speechError,
  speechLanguage,
  isSpeechRecognitionSupported,
  onInputChange,
  onKeyDown,
  onSend,
  onToggleListening,
  onSpeechErrorDismiss,
  onSpeechLanguageChange,
}) => (
  <div className="p-4 border-t border-outline">
    {speechError && (
      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
        {speechError}
        <button
          onClick={onSpeechErrorDismiss}
          className="ml-2 text-red-500 hover:text-red-700"
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>
    )}

    <div className="flex items-end space-x-2">
      <div className="flex-1 relative">
        <textarea
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your question here... (Press Enter to send, Shift+Enter for new line)"
          rows={3}
          className="w-full border border-outline rounded-lg px-3 py-2 pr-10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          disabled={loading || isListening}
        />
        {isSpeechRecognitionSupported && (
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <select
              value={speechLanguage}
              onChange={(e) => onSpeechLanguageChange(e.target.value as SpeechLanguage)}
              disabled={loading || isListening}
              className="text-xs border border-outline rounded px-2 py-1 bg-surface text-content-secondary disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-brand"
              title="Select speech recognition language"
            >
              <option value="auto">Auto (EN/HE)</option>
              <option value="en-US">English</option>
              <option value="he-IL">עברית (Hebrew)</option>
            </select>
            <button
              onClick={onToggleListening}
              disabled={loading}
              className={`p-2 rounded-full transition-all ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-gray-200 hover:bg-gray-300 text-content-secondary'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={isListening ? 'Stop recording' : 'Start voice input'}
              title={isListening ? 'Stop recording' : 'Start voice input'}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
      <button
        onClick={onSend}
        disabled={!inputValue.trim() || loading}
        className="bg-brand hover:bg-brand-hover text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand"
      >
        Send
      </button>
    </div>
    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
      LLMs can make mistakes. Check important information.
    </p>
  </div>
);

// Re-export DashboardData for backward compatibility
export type { DashboardData };

export default function AIChatModal({
  isOpen,
  onClose,
  chatType,
  insightsId,
  recommendationId,
  teamName,
  piName,
  isGroup,
  promptName,
  dashboardData,
}: AIChatModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const finalTranscriptRef = useRef<string>('');

  const {
    messages,
    loading,
    hasInitialMessage,
    sendMessage,
  } = useAIChat({
    isOpen,
    chatType,
    insightsId,
    recommendationId,
    teamName,
    piName,
    isGroup,
    promptName,
    dashboardData,
  });

  const speech = useSpeechRecognition({
    loading,
    getInitialText: () => inputValue,
    onTextChange: (text) => {
      setInputValue(text);
      finalTranscriptRef.current = text;
    },
  });

  // Handle slide-in animation
  useEffect(() => {
    if (isOpen) {
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Handle closing with animation
  const handleClose = () => {
    setIsVisible(false);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Reset local input + speech when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
      finalTranscriptRef.current = '';
      speech.reset();
    }
  }, [isOpen, speech]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const question = inputValue.trim();
    if (!question || loading) return;

    // Clear input immediately (before stopping mic to prevent any race conditions)
    setInputValue('');
    finalTranscriptRef.current = '';

    // Stop microphone if listening and clear transcript
    if (speech.isListening) {
      speech.clearTranscript(); // This sets skipEndUpdateRef to true, preventing onresult/onend from updating
      speech.stopListening(true); // Skip the update in stopListening too
    }

    await sendMessage(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`fixed top-0 right-0 h-full w-full sm:w-[420px] md:w-[480px] lg:w-[520px] bg-surface/70 dark:bg-surface/75 backdrop-blur-sm border-l border-outline/40 shadow-xl z-40 flex flex-col transform transition-transform duration-300 ease-out ${
        isVisible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <ChatHeader onClose={handleClose} onMouseDown={() => {}} />

      <ChatMessages
        messages={messages}
        loading={loading}
        hasInitialMessage={hasInitialMessage}
        messagesEndRef={messagesEndRef}
      />

      <ChatInput
        inputValue={inputValue}
        loading={loading}
        isListening={speech.isListening}
        speechError={speech.error}
        speechLanguage={speech.language}
        isSpeechRecognitionSupported={speech.isSupported}
        onInputChange={setInputValue}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
        onToggleListening={speech.toggleListening}
        onSpeechErrorDismiss={() => speech.setError(null)}
        onSpeechLanguageChange={(newLang) => {
          speech.setLanguage(newLang);
          if (speech.isListening) {
            speech.stopListening();
            setTimeout(() => speech.startListening(), 100);
          }
        }}
      />
    </div>
  );
}
