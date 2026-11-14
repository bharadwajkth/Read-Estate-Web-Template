import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, MessageSquare, RotateCcw, Send, X } from 'lucide-react';
import { formatAreaSqFt } from '../lib/propertyUtils';
import type { ChatTurn } from '../lib/aiMatcher';
import type { AgencySettings, Property } from '../types';

interface PropertyAdvisorChatProps {
  agency: AgencySettings;
  properties: Property[];
  onInspectProperty: (property: Property) => void;
}

interface UiChatMessage extends ChatTurn {
  id: string;
  recommendedProperties?: Property[];
  followUpSuggestions?: string[];
}

const STARTER_PROMPTS = [
  'Most affordable lease options',
  'Warehouses under ₹5 L / mo',
  'Industrial plots for sale',
  'Units with 150+ kVA power',
];

export function PropertyAdvisorChat({
  agency,
  properties,
  onInspectProperty,
}: PropertyAdvisorChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<UiChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Ask me about budget limits, required sq.ft, power capacity, or corridors—I will match affordable and suitable properties from ${agency.agencyName}'s live inventory.`,
      followUpSuggestions: STARTER_PROMPTS.slice(0, 3),
    },
  ]);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, sending]);

  function handleReset() {
    setError('');
    setInput('');
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: `Ask me about budget limits, required sq.ft, power capacity, or corridors—I will match affordable and suitable properties from ${agency.agencyName}'s live inventory.`,
        followUpSuggestions: STARTER_PROMPTS.slice(0, 3),
      },
    ]);
  }

  async function sendQuery(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: UiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setSending(true);

    try {
      const historyPayload: ChatTurn[] = nextMessages
        .filter((m) => m.id !== 'welcome' && !m.id.startsWith('welcome-'))
        .slice(0, -1)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not reach the Property Advisor.');
        return;
      }

      const idList: string[] = Array.isArray(data.recommendedPropertyIds)
        ? data.recommendedPropertyIds
        : [];
      const matchedProps = idList
        .map((id) => properties.find((p) => p.id === id))
        .filter((p): p is Property => Boolean(p));

      const assistantMsg: UiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'Here are the closest matches from our catalog.',
        recommendedProperties: matchedProps,
        followUpSuggestions: Array.isArray(data.followUpSuggestions)
          ? data.followUpSuggestions
          : [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setError('Network error while contacting the Property Advisor.');
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendQuery(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open AI Property Advisor"
          className="inline-flex items-center gap-2.5 h-11 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-sky-700 border border-slate-800 rounded-md shadow-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Property Advisor</span>
        </button>
      ) : (
        <section
          aria-label="AI Property Advisor"
          className="w-[calc(100vw-2rem)] sm:w-[420px] max-h-[82vh] flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
        >
          {/* Chat Header */}
          <div className="shrink-0 px-4 py-3 bg-slate-950 text-white flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-sm font-semibold truncate">
                AI Property Advisor
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Budget, floor area &amp; corridor matching
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                aria-label="Reset conversation"
                title="New Chat"
                className="w-8 h-8 inline-flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close AI Property Advisor"
                className="w-8 h-8 inline-flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-md px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-sky-700 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Clickable Property Recommendation Cards */}
                {msg.recommendedProperties && msg.recommendedProperties.length > 0 && (
                  <div className="mt-2.5 w-full space-y-2">
                    {msg.recommendedProperties.map((prop) => (
                      <div
                        key={prop.id}
                        className="bg-white border border-slate-200 rounded-md p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500 truncate">
                              {prop.category} · {prop.transactionType} · {prop.corridor}
                            </p>
                            <p className="text-xs font-semibold text-slate-950 truncate mt-0.5">
                              {prop.title}
                            </p>
                          </div>
                          <span className="font-mono tabular-nums text-xs font-semibold text-sky-700 shrink-0">
                            {prop.priceDisplay}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                          <span className="font-mono tabular-nums">
                            {formatAreaSqFt(prop.specs.areaSqFt)} · {prop.specs.roadWidthFt} ft road
                          </span>
                          <button
                            type="button"
                            onClick={() => onInspectProperty(prop)}
                            className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-sky-700 cursor-pointer whitespace-nowrap"
                          >
                            Inspect
                            <ArrowRight className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Follow-Up Prompt Buttons */}
                {msg.role === 'assistant' &&
                  msg.followUpSuggestions &&
                  msg.followUpSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.followUpSuggestions.map((promptText) => (
                        <button
                          key={promptText}
                          type="button"
                          disabled={sending}
                          onClick={() => void sendQuery(promptText)}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {promptText}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}

            {sending && (
              <div className="flex items-start">
                <div className="bg-white border border-slate-200 rounded-md px-3.5 py-2 text-xs text-slate-500">
                  Searching active properties...
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800"
              >
                {error}
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <label htmlFor="advisor-chat-input" className="sr-only">
              Ask AI Property Advisor
            </label>
            <input
              id="advisor-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Affordable warehouse under 3 lakh..."
              className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-700 focus:bg-white"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="inline-flex items-center justify-center w-9 h-9 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white rounded-md transition-colors shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
