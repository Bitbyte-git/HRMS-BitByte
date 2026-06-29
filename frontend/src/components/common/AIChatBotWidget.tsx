import React, { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Bot, Loader2, Send, Sparkles, X } from 'lucide-react';
import { chatbotApi } from '../../services/api';
import { useAuthStore } from '../../context/authStore';

type ChatMessage = {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
};

const roleLabel: Record<string, string> = {
  employee: 'Employee',
  intern: 'Employee',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const initialMessage: ChatMessage = {
  id: 'assistant-welcome',
  sender: 'assistant',
  text: 'Hi, I am your BitByte HR assistant. Ask me about the HR portal modules available to your role.',
};

const isSessionError = (error: unknown) => {
  const status = (error as any)?.response?.status;
  return status === 401 || status === 403 || !status;
};

export const AIChatBotWidget: React.FC = () => {
  const { user, token, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const title = useMemo(() => `${roleLabel[user?.role || 'employee'] || 'HR'} Assistant`, [user?.role]);
  const trimmedInput = input.trim();
  const canSend = Boolean(trimmedInput) && !isSending && isAuthenticated && Boolean(token);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isSending, isOpen]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!trimmedInput || isSending) return;

    if (!isAuthenticated || !token) {
      setErrorMessage('Session expired. Please re-authenticate.');
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      sender: 'user',
      text: trimmedInput,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setErrorMessage('');
    setIsSending(true);

    try {
      const res = await chatbotApi.sendMessage(trimmedInput);
      const assistantText = res.data.response || 'I could not generate a response right now.';

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          sender: 'assistant',
          text: assistantText,
        },
      ]);
    } catch (error) {
      setErrorMessage(
        isSessionError(error)
          ? 'Session expired. Please re-authenticate.'
          : 'The assistant is unavailable right now. Please try again shortly.',
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const openWidget = () => {
    setIsOpen(true);
    setErrorMessage('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          className="mb-4 flex h-[min(620px,calc(100vh-7rem))] w-[calc(100vw-2.5rem)] max-w-[390px] flex-col overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950 text-white shadow-2xl shadow-slate-950/40 animate-fade-in"
          aria-label="AI chat assistant"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/25">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
                <p className="truncate text-xs text-slate-400">Groq AI · BitByte HR Portal</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                    message.sender === 'user'
                      ? 'bg-cyan-400 text-slate-950'
                      : 'border border-white/10 bg-slate-900/90 text-slate-100'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="flex max-w-[86%] items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                  AI is thinking...
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-3 text-sm text-red-100">
                <div className="flex gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-white/10 bg-slate-900 p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-slate-950 p-2 focus-within:border-cyan-300/50">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={1200}
                placeholder="Ask about HRMS..."
                className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-white placeholder:text-slate-500 focus:outline-none"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!canSend}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 transition-all hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                aria-label="Send message"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={isOpen ? () => setIsOpen(false) : openWidget}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow-xl shadow-cyan-400/25 ring-4 ring-cyan-300/15 transition-all hover:-translate-y-0.5 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-200"
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </div>
  );
};
