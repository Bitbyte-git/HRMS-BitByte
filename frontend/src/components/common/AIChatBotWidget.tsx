import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bot, LifeBuoy, Loader2, MessageSquare, Navigation, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { chatbotApi } from '../../services/api';
import { useAuthStore } from '../../context/authStore';
import type { ChatbotQuestion } from '../../types';

const SUPPORT_TICKET_URL =
  import.meta.env.VITE_SUPPORT_TICKET_URL ||
  'mailto:support@bitbyte.com?subject=HRMS%20Support%20Ticket';

const roleLabel: Record<string, string> = {
  employee: 'Employee',
  intern: 'Employee',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

const getErrorMessage = (error: unknown) => {
  const status = (error as any)?.response?.status;
  if (status === 401) return 'Please log in to use the assistant.';
  if (status === 403) return 'Your role does not have assistant access.';
  return 'The assistant is unavailable right now. Please try again shortly.';
};

export const AIChatBotWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<ChatbotQuestion | null>(null);

  const canFetch = isOpen && isAuthenticated && Boolean(token);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['chatbotQuestions', user?.role],
    queryFn: () => chatbotApi.getQuestions().then((res) => res.data.data?.questions || []),
    enabled: canFetch,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  const questions = data || [];
  const authMessage = !isAuthenticated || !token ? 'Please log in to use the assistant.' : '';
  const title = useMemo(() => `${roleLabel[user?.role || 'employee'] || 'HR'} Assistant`, [user?.role]);

  const openWidget = () => {
    setIsOpen(true);
    setSelectedQuestion(null);
  };

  const goToPath = (path: string) => {
    if (!path) return;
    setIsOpen(false);
    navigate(path);
  };

  const openSupport = () => {
    if (SUPPORT_TICKET_URL.startsWith('/')) {
      setIsOpen(false);
      navigate(SUPPORT_TICKET_URL);
      return;
    }
    window.location.href = SUPPORT_TICKET_URL;
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          className="mb-4 w-[calc(100vw-2.5rem)] max-w-[380px] overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950 text-white shadow-2xl shadow-slate-950/40 animate-fade-in"
          aria-label="AI assistant"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/25">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
                <p className="truncate text-xs text-slate-400">BitByte HR Portal</p>
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

          <div className="max-h-[430px] min-h-[260px] overflow-y-auto bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-4">
            {selectedQuestion ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSelectedQuestion(null)}
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-300/10"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Questions
                </button>

                <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
                  <p className="text-sm font-semibold leading-5 text-white">{selectedQuestion.text}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{selectedQuestion.answer}</p>
                  <button
                    type="button"
                    onClick={() => goToPath(selectedQuestion.actionPath)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-300"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Open {selectedQuestion.moduleLabel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/10 px-3 py-2">
                  <p className="text-xs font-medium leading-5 text-cyan-100">
                    Available topics for your account.
                  </p>
                </div>

                {authMessage && (
                  <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-3 text-sm text-amber-100">
                    {authMessage}
                  </div>
                )}

                {!authMessage && (isLoading || isFetching) && (
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                    Loading your assistant options...
                  </div>
                )}

                {!authMessage && error && (
                  <div className="space-y-3 rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-3 text-sm text-red-100">
                    <p>{getErrorMessage(error)}</p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="rounded-lg border border-red-200/30 px-3 py-1.5 text-xs font-semibold text-red-50 transition-colors hover:bg-red-200/10"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!authMessage && !error && !isLoading && questions.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-slate-300">
                    No assistant questions are configured for your role yet.
                  </div>
                )}

                {!authMessage && !error && questions.map((question) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setSelectedQuestion(question)}
                    className="group flex w-full items-start gap-3 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-3 text-left transition-all hover:border-cyan-300/45 hover:bg-slate-800"
                  >
                    <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-cyan-300 ring-1 ring-white/10 group-hover:bg-cyan-300 group-hover:text-slate-950">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-5 text-slate-100">{question.text}</span>
                      <span className="mt-1 block text-xs text-slate-400">{question.moduleLabel}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-slate-900 px-4 py-3">
            <button
              type="button"
              onClick={openSupport}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-slate-950 px-3 py-2.5 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-300 hover:text-slate-950"
            >
              <LifeBuoy className="h-4 w-4" />
              Contact Support / Raise Ticket
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={isOpen ? () => setIsOpen(false) : openWidget}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow-xl shadow-cyan-400/25 ring-4 ring-cyan-300/15 transition-all hover:-translate-y-0.5 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-200"
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
};
